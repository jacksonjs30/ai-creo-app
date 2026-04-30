'use client';

import { Plus, Folder, Clock, CheckCircle, Play, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
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

    allProjects = allProjects.map(p => {
      let scriptsCount = 0;
      try {
        const scripts = JSON.parse(localStorage.getItem(`projectScripts_${p.id}`) || '[]');
        scriptsCount = scripts.length;
      } catch (e) {}
      return { ...p, scriptsCount };
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
    <div>
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

          <Link href="/project/new" className="btn btn-primary">
            <Plus size={18} /> Новый проект
          </Link>
        </div>
      </div>



      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block' }} />
          <p>Загружаем проекты...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <Folder className="empty-state-icon" />
          <h3>У вас пока нет сохранённых проектов</h3>
          <p>Создайте первый проект и сгенерируйте аватары вашей аудитории</p>
          <Link href="/project/new" className="btn btn-primary">
            <Plus size={18} /> Создать первый проект
          </Link>
          {!hasLocal && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              💡 Чтобы проекты сохранялись — настройте Supabase в .env.local
            </p>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project: any) => (
            <div key={project.id} className="card project-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-header" style={{ position: 'relative', padding: '1.5rem 1.5rem 0' }}>
                <div style={{ paddingRight: '2rem' }}>
                  <h3 className="card-title text-truncate">{project.name}</h3>
                  <p className="card-subtitle">{formatDate(project.created_at)}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
                  {project.status === 'done' ? (
                    <span className="badge badge-success">
                      <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> Готово
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      <Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> В работе
                    </span>
                  )}
                  
                  <button 
                    onClick={(e) => handleDelete(e, project.id, project.name)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                    title="Удалить проект"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {project.avatars?.length ? `${project.avatars.length} сегм. аудитории` : 'Аватары не сгенерированы'}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/project/${project.id}`} className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', padding: '0.5rem' }}>
                    Аватары ({project.avatars?.length || 0})
                  </Link>
                  <Link href={`/project/${project.id}/scripts`} className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', padding: '0.5rem' }}>
                    Сценарии ({project.scriptsCount || 0})
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
