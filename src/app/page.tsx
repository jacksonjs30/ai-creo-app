'use client';

import { Plus, Folder, Clock, CheckCircle, Play, Loader2, RefreshCw } from 'lucide-react';
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Мои проекты</h1>
          <p style={{ color: 'var(--text-muted)' }}>Управляйте вашими брифами и рекламными креативами</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadProjects} className="btn btn-secondary" title="Обновить список">
            <RefreshCw size={16} /> Обновить
          </button>
          <Link href="/project/new" className="btn btn-primary">
            <Plus size={18} /> Новый проект
          </Link>
        </div>
      </div>

      {/* Баннер: несохранённая сессия */}
      {hasLocal && (
        <div style={{
          background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
          border: '1px solid #bae6fd', borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div>
            <p style={{ fontWeight: 600, color: '#0369a1' }}>📋 Есть незавершённая сессия</p>
            <p style={{ fontSize: '0.875rem', color: '#0284c7' }}>Вы генерировали аватары — результаты сохранены локально</p>
          </div>
          <Link href="/project/temp-id" className="btn btn-primary" style={{ flexShrink: 0 }}>
            Продолжить →
          </Link>
        </div>
      )}

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
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{project.name}</h3>
                  <p className="card-subtitle">{formatDate(project.created_at)}</p>
                </div>
                {project.status === 'done' ? (
                  <span className="badge badge-success">
                    <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> Готово
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> В работе
                  </span>
                )}
              </div>

              <div className="preview-box">
                {project.avatars?.length ? (
                  <div style={{
                    position: 'relative', width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                      {project.avatars.length} аватар{project.avatars.length > 1 ? 'а' : ''}
                    </span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ожидает генерации</span>
                )}
              </div>

              <div className="flex-between mt-4">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {project.avatars?.length ? `${project.avatars.length} сегм. аудитории` : 'Нет данных'}
                </span>
                <Link href={`/project/${project.id}`} className="btn btn-secondary">
                  {project.status === 'done' ? 'Смотреть' : 'Открыть →'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
