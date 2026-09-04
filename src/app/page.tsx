'use client';

import { Plus, Folder, Clock, CheckCircle, Play, Loader2, RefreshCw, Trash2, FileText, Search, Filter, BarChart2, Users, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import TopHeader from '@/components/TopHeader';

interface Project {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  avatars?: any[];
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLocal, setHasLocal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalProjects: 0, totalAvatars: 0, totalScripts: 0, totalCreatives: 0 });

  useEffect(() => {
    setMounted(true);
    loadProjects();
    // Проверяем есть ли несохранённая сессия в localStorage
    const local = localStorage.getItem('tempGeneratedAvatars');
    const brief = localStorage.getItem('tempBrief');
    if (local && brief) setHasLocal(true);
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    let allProjects: Project[] = [];
    
    try {
      // 1. Пробуем загрузить из Supabase
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        allProjects = [...data.projects];
      }
    } catch (e) {
      console.warn('Supabase fetch failed, using local fallback only');
    }

    // 2. Добавляем локальный проект если он есть
    const localAvatars = localStorage.getItem('tempGeneratedAvatars');
    const localBrief = localStorage.getItem('tempBrief');
    
    if (localAvatars && localBrief) {
      const brief = JSON.parse(localBrief);
      const avatars = JSON.parse(localAvatars);
      
      // Проверяем нет ли его уже в списке от Supabase (по имени)
      if (!allProjects.find(p => p.name === brief.productName)) {
        allProjects.unshift({
          id: 'temp-id',
          name: brief.productName || 'Локальный проект',
          status: 'avatars_ready',
          created_at: new Date().toISOString(),
          avatars: avatars
        });
      }
    }

    let tAvatars = 0;
    let tScripts = 0;
    let tCreatives = 0;

    allProjects = allProjects.map(p => {
      let scriptsCount = 0;
      let creativesCount = 0;
      try {
        const localScripts = JSON.parse(localStorage.getItem(`projectScripts_${p.id}`) || '[]');
        const dbScripts = (p as any).brief?.scripts || [];
        
        // Объединяем по ID, чтобы не дублировать
        const allScriptsMap = new Map();
        [...dbScripts, ...localScripts].forEach(s => {
          if (s && s.id) allScriptsMap.set(s.id, s);
        });
        scriptsCount = allScriptsMap.size;

        Array.from(allScriptsMap.values()).forEach((s: any) => {
          if (s.rowImages) {
            Object.values(s.rowImages).forEach((imgs: any) => {
              creativesCount += Array.isArray(imgs) ? imgs.length : 0;
            });
          }
        });
      } catch (e) {}

      tAvatars += (p.avatars?.length || 0);
      tScripts += scriptsCount;
      tCreatives += creativesCount;

      return { ...p, scriptsCount, creativesCount };
    });

    setStats({
      totalProjects: allProjects.length,
      totalAvatars: tAvatars,
      totalScripts: tScripts,
      totalCreatives: tCreatives
    });

    setProjects(allProjects);
    setLoading(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Вы уверены, что хотите удалить проект "${name}"?\nЭто действие нельзя отменить.`)) {
      return;
    }

    if (id === 'temp-id') {
      localStorage.removeItem('tempGeneratedAvatars');
      localStorage.removeItem('tempBrief');
      localStorage.removeItem('tempGeneratedCreatives');
      setHasLocal(false);
      loadProjects();
      return;
    }

    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Не удалось удалить проект');
      }
      loadProjects();
    } catch (err) {
      alert('Ошибка при удалении проекта');
      console.error(err);
    }
  };

  const handleSyncToCloud = async () => {
    if (!window.confirm('Синхронизировать все локальные сценарии с облаком? Это позволит видеть их на сервере Vercel.')) return;
    
    setLoading(true);
    let successCount = 0;
    
    try {
      for (const project of projects) {
        if (project.id === 'temp-id') continue;
        
        const scripts = JSON.parse(localStorage.getItem(`projectScripts_${project.id}`) || '[]');
        if (scripts.length === 0) continue;
        
        // Получаем текущий бриф проекта
        const res = await fetch(`/api/projects?id=${project.id}`);
        if (!res.ok) continue;
        const data = await res.json();
        const currentProject = data.project || data.product || data;
        
        // Обновляем бриф, добавляя туда сценарии
        const updatedBrief = { 
          ...(currentProject.brief || {}), 
          scripts: scripts 
        };
        
        const updateRes = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: project.id,
            brief: updatedBrief
          })
        });
        
        if (updateRes.ok) successCount++;
      }
      
      alert(`Синхронизация завершена! Успешно обновлено проектов: ${successCount}. Теперь сценарии доступны на сервере.`);
      loadProjects();
    } catch (err) {
      console.error('Sync error:', err);
      alert('Произошла ошибка при синхронизации');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = () => {
    const backupData: any = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      localStorage: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('projectScripts_') || 
        key.startsWith('tempBrief_') || 
        key.startsWith('tempAvatars_') ||
        key === 'tempBrief' ||
        key === 'tempGeneratedAvatars'
      )) {
        backupData.localStorage[key] = localStorage.getItem(key);
      }
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `creo_ai_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.localStorage) {
          Object.keys(data.localStorage).forEach(key => {
            localStorage.setItem(key, data.localStorage[key]);
          });
          alert('Данные успешно импортированы! Перезагружаем страницу...');
          window.location.reload();
        }
      } catch (err) {
        alert('Ошибка при импорте файла');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container" suppressHydrationWarning>
      <TopHeader />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Мои проекты</h1>
          <p style={{ color: 'var(--text-muted)' }}>Управляйте вашими брифами и рекламными креативами</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          
          {/* Панель инструментов синхронизации */}
          <div style={{ 
            display: 'flex', 
            gap: '0.25rem', 
            padding: '4px', 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            border: '1px solid var(--border)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <button 
              onClick={() => {
                const content = `# A-to-A: Логика работы AI Creative Engine\n\n**A-to-A (Avatar-to-Ads)** — это интеллектуальная система автоматизации маркетинговых исследований и генерации рекламных креативов. Сервис превращает сухие данные продукта в глубокие психологические портреты аудитории и готовые сценарии для продакшена.\n\n---\n\n## 1. Концепция: Исследование прежде Креатива\nГлавная логика сервиса: **реклама не работает без понимания боли**.\n\n## 2. Этапы трансформации идеи\n### Этап А: Сбор контекста (Бриф)\n### Этап Б: Идентификация сегментов (Discovery)\n### Этап В: Глубокое исследование (Avatar Research)\n### Этап Г: Генерация сценариев (Creative Studio)\n### Этап Д: Производство активов (Asset Production)\n### Этап Е: Автоматизированный запуск (Deployment)\n### Этап Ж: Аналитический цикл и обучение (Feedback Loop)\n\n*(Полный текст доступен в файле SERVICE_LOGIC.md)*`;
                const blob = new Blob([content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'SERVICE_LOGIC.md';
                a.click();
              }} 
              className="btn btn-secondary" 
              title="Скачать описание логики сервиса" 
              style={{ padding: '8px', border: 'none', background: 'transparent' }}
            >
              <FileText size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            <div style={{ width: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
            <button onClick={handleSyncToCloud} className="btn btn-secondary" title="Облачная синхронизация (сохранить все в БД)" style={{ padding: '8px', border: 'none', background: 'transparent' }}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
            </button>
            <div style={{ width: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
            <button onClick={handleExportAll} className="btn btn-secondary" title="Экспорт в файл" style={{ padding: '8px', border: 'none', background: 'transparent' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <label className="btn btn-secondary" title="Импорт из файла" style={{ cursor: 'pointer', margin: 0, padding: '8px', border: 'none', background: 'transparent' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportAll} />
            </label>
          </div>

          <Link href="/referrals" className="btn btn-secondary" style={{ marginRight: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Реферальная программа
          </Link>
          <Link href="/project/new" className="btn btn-primary">
            <Plus size={18} /> Новый проект
          </Link>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '12px' }}><LayoutDashboard size={24} color="#3b82f6" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{mounted ? stats.totalProjects : '-'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Активных проектов</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px' }}><Users size={24} color="#22c55e" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{mounted ? stats.totalAvatars : '-'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Сегментов аудитории</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '12px' }}><FileText size={24} color="#ef4444" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{mounted ? stats.totalScripts : '-'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Готовых сценариев</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{mounted ? stats.totalCreatives : '-'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Сгенерировано креативов</div>
          </div>
        </div>
      </div>

      {/* Toolbar (Search & Filters) */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Поиск по проектам..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none' }} 
          />
        </div>
        <button className="btn btn-secondary" style={{ background: 'white', border: '1px solid var(--border)' }}>
          <Filter size={18} /> Фильтры
        </button>
      </div>      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block' }} />
          <p>Загружаем проекты...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', border: '1px dashed var(--border)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Folder size={40} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Проектов пока нет</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>Загрузите ваш первый бриф, чтобы AI провел глубокое исследование аудитории и создал сценарии.</p>
          <Link href="/project/new" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
            <Plus size={20} /> Создать первый проект
          </Link>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((project: any) => {
            const avatarCount = project.avatars?.length || 0;
            const scriptsCount = project.scriptsCount || 0;
            const creativesCount = project.creativesCount || 0;

            // Progress calculation
            const progress = scriptsCount > 0 ? 100 : (avatarCount > 0 ? 66 : 33);

            return (
              <div key={project.id} className="card project-card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ paddingRight: '1rem' }}>
                      <h3 className="card-title text-truncate" style={{ marginBottom: '0.25rem' }}>{project.name}</h3>
                      <p className="card-subtitle" style={{ fontSize: '0.8rem' }}>{formatDate(project.created_at)}</p>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, project.id, project.name)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                      title="Удалить проект"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <span>Прогресс воронки</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--secondary)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#22c55e' : 'var(--primary)' }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'var(--border)' }}>
                  <Link href={`/project/${project.id}?tab=avatars`} style={{ background: 'white', padding: '1rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{mounted ? avatarCount : '-'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Аватары</span>
                  </Link>
                  <Link href={`/project/${project.id}?tab=studio&view=scripts`} style={{ background: 'white', padding: '1rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{mounted ? scriptsCount : '-'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Сценарии</span>
                  </Link>
                  <Link href={`/project/${project.id}?tab=gallery`} style={{ background: 'white', padding: '1rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{mounted ? creativesCount : '-'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Креативы</span>
                  </Link>
                </div>
                
                <Link href={`/project/${project.id}`} style={{ background: 'var(--secondary)', padding: '1rem', textAlign: 'center', textDecoration: 'none', fontWeight: 600, color: 'var(--primary)', fontSize: '0.875rem' }}>
                  Открыть Workspace →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
