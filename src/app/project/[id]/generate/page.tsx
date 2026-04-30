'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Image as ImageIcon, Video, Smile, LayoutTemplate, Palette, Mic, CheckCircle2, Lock, Loader2, PlayCircle, FileText, Camera, User } from 'lucide-react';

const CREATIVE_TYPES = [
  { id: 'Відео-крео на основі JTBD + CJM', name: 'Відео-крео (JTBD + CJM)', icon: PlayCircle },
  { id: 'Текст на білому фоні (статична картинка)', name: 'Текст на білому фоні', icon: FileText },
  { id: 'Крео з фото/графікою + текст', name: 'Фото + текст', icon: Camera },
  { id: 'Крео в стилі Specsavers', name: 'Стиль Specsavers', icon: Video },
  { id: 'Мем-крео', name: 'Мем-крео', icon: Smile }
];

const TONE_OPTIONS = [
  { id: 'Дружелюбный → тёплый, разговорный, на "ты", без давления', label: 'Дружелюбный' },
  { id: 'Экспертный → уверенный, фактологичный, данные и факты, авторитет', label: 'Экспертный' },
  { id: 'Провокационный → острый хук, вызов статусу-кво', label: 'Провокационный' },
  { id: 'Вдохновляющий → эмоциональный подъём, трансформация', label: 'Вдохновляющий' }
];

const LANGUAGE_OPTIONS = ['Українська', 'Русский', 'English'];

export default function GenerateCreatives({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [avatars, setAvatars] = useState<any[]>([]);
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number | null>(null);
  
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [variantsCount, setVariantsCount] = useState<number>(3);
  
  const [productName, setProductName] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState(TONE_OPTIONS[0].id);
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [focusDirection, setFocusDirection] = useState('');

  const [useColors, setUseColors] = useState(false);
  const [mainColor, setMainColor] = useState('#3b82f6');
  const [secondColor, setSecondColor] = useState('#1e293b');
  const [accentColor, setAccentColor] = useState('#f59e0b');

  useEffect(() => {
    async function loadProject() {
      try {
        let loadedProject = null;
        let loadedAvatars: any[] = [];
        
        if (id && id !== 'temp-id') {
          const res = await fetch(`/api/projects?id=${id}`);
          if (res.ok) {
            const data = await res.json();
            loadedProject = data.project || data.product || data;
            if (loadedProject?.avatars) loadedAvatars = loadedProject.avatars;
          }
        } else {
           const localBrief = localStorage.getItem('tempBrief');
           if (localBrief) loadedProject = { name: JSON.parse(localBrief).productName };
        }
        
        // Попытка загрузить из LocalStorage
        const localBriefId = localStorage.getItem(`tempBrief_${id}`) || localStorage.getItem('tempBrief');
        if (localBriefId && !loadedProject) {
           loadedProject = { name: JSON.parse(localBriefId).productName };
        }
        
        const localAvatars = localStorage.getItem(`tempAvatars_${id}`) || localStorage.getItem('tempGeneratedAvatars');
        if (localAvatars && loadedAvatars.length === 0) {
           loadedAvatars = JSON.parse(localAvatars);
        }

        if (loadedProject) {
           setProject(loadedProject);
           setProductName(loadedProject.name || loadedProject.productName || '');
        }
        if (loadedAvatars) setAvatars(loadedAvatars);

      } catch (e) {
        console.error('Error loading project:', e);
      }
    }
    loadProject();
  }, [id]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAvatarIdx === null || !selectedType || !productName || !productName.trim()) {
      alert('Пожалуйста, выберите аватара, формат креатива и укажите название продукта.');
      return;
    }
    
    setIsGenerating(true);

    try {
      const selectedAvatar = avatars[selectedAvatarIdx];

      const response = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          productName,
          avatarData: selectedAvatar,
          format: selectedType,
          toneOfVoice,
          language,
          count: variantsCount,
          focusDirection: focusDirection.trim() || undefined,
          colors: useColors ? { main: mainColor, secondary: secondColor, accent: accentColor } : undefined
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при генерации сценариев');
      }
      
      // Сохраняем скрипт локально в массив проекта
      const scriptsKey = `projectScripts_${id}`;
      const existingScripts = JSON.parse(localStorage.getItem(scriptsKey) || '[]');
      const updatedScripts = [data.script, ...existingScripts];
      localStorage.setItem(scriptsKey, JSON.stringify(updatedScripts));

      // Сохраняем также в базу данных для синхронизации
      if (id && id !== 'temp-id' && project) {
        try {
          const updatedBrief = {
            ...(project.brief || {}),
            scripts: updatedScripts
          };
          
          await fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              brief: updatedBrief
            })
          });
        } catch (dbErr) {
          console.error('Failed to sync script to DB:', dbErr);
        }
      }

      // Перенаправляем на страницу сохраненных сценариев
      router.push(`/project/${id}/scripts`);
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при генерации: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
        <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Проекты</Link>
        <span>/</span>
        <Link href={`/project/${id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{project?.name || project?.productName || 'Проект'}</Link>
        <span>/</span>
        <span style={{ color: '#1e293b' }}>Генерация сценариев</span>
      </div>
      
      <div className="mb-8">
        <h1 className="page-title">Сценарии креативов</h1>
        <p className="page-subtitle">Генерация точных ТЗ и сценариев по методологии JTBD + CJM</p>
      </div>

      <form onSubmit={handleGenerate} className="grid-layout">
        
        {/* Шаг 1: Аватар */}
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="card-title mb-4">1. Выберите целевой аватар (сегмент)</h3>
          {avatars.length === 0 ? (
            <p style={{ color: '#ef4444' }}>Аватары не найдены. Сначала сгенерируйте их в проекте.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {avatars.map((avatar, idx) => (
                <div 
                  key={idx}
                  onClick={() => !isGenerating && setSelectedAvatarIdx(idx)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${selectedAvatarIdx === idx ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    background: selectedAvatarIdx === idx ? '#eff6ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: selectedAvatarIdx === idx ? '#1d4ed8' : '#475569' }}>
                    <User size={18} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Сегмент #{idx + 1}</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>
                    {avatar.segmentName}
                  </h4>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Шаг 2: Формат креатива */}
        <section className="card">
          <h3 className="card-title mb-6">2. Формат креатива (один за сессию)</h3>
          
          <div className="types-grid" style={{ gridTemplateColumns: '1fr' }}>
            {CREATIVE_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              const Icon = type.icon;
              
              return (
                <button
                  key={type.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setSelectedType(type.id)}
                  className={`type-card ${isSelected ? 'selected' : ''}`}
                  style={{ justifyContent: 'flex-start', padding: '1rem 1.5rem', flexDirection: 'row', textAlign: 'left', minHeight: 'auto' }}
                >
                  <div className="icon-wrapper" style={{ margin: 0 }}>
                    <Icon size={20} />
                  </div>
                  <span className="type-name" style={{ margin: 0, fontSize: '1rem', flex: 1 }}>{type.name}</span>
                  {isSelected && <CheckCircle2 size={18} className="check-icon" style={{ position: 'static' }} />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Шаг 3: Настройки */}
        <section className="card">
          <h3 className="card-title mb-6">3. Параметры генерации</h3>
          
          <div className="settings-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-group">
              <label>Название продукта / курса</label>
              <input 
                type="text" 
                required
                disabled={isGenerating}
                value={productName} 
                onChange={e => setProductName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div className="form-group">
              <label>Tone of Voice (Стиль речи)</label>
              <select 
                disabled={isGenerating}
                value={toneOfVoice} 
                onChange={e => setToneOfVoice(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {TONE_OPTIONS.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Язык результата</label>
              <select 
                disabled={isGenerating}
                value={language} 
                onChange={e => setLanguage(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {LANGUAGE_OPTIONS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="form-group mt-4">
              <label>Фокус / Направление креатива (опционально)</label>
              <textarea 
                placeholder="Например: 'Спина болит вечером' или 'Боль во время тренировок'. ИИ сделает акцент на этом."
                disabled={isGenerating}
                value={focusDirection} 
                onChange={e => setFocusDirection(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div className="form-group mt-4">
              <label>Количество вариантов</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="range" 
                  min="1" max="5" 
                  disabled={isGenerating}
                  value={variantsCount} 
                  onChange={(e) => setVariantsCount(parseInt(e.target.value))} 
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', minWidth: '20px' }}>{variantsCount}</span>
              </div>
            </div>

            {/* Цвета */}
            <div className="form-group mt-6" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: useColors ? '1rem' : 0 }}>
                <input 
                  type="checkbox" 
                  checked={useColors} 
                  onChange={e => setUseColors(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 700, color: '#1e293b' }}>Использовать брендовые цвета (опционально)</span>
              </label>
              
              {useColors && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Основной цвет</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="color" value={mainColor} onChange={e => setMainColor(e.target.value)} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                      <input type="text" value={mainColor} onChange={e => setMainColor(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Второй цвет</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="color" value={secondColor} onChange={e => setSecondColor(e.target.value)} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                      <input type="text" value={secondColor} onChange={e => setSecondColor(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Цвет акцентов</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                      <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={selectedAvatarIdx === null || !selectedType || !productName || !productName.trim() || isGenerating}
            style={{ padding: '1.25rem 3rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '16px' }}
          >
            {isGenerating ? <Loader2 size={24} className="animate-spin" /> : null}
            {isGenerating ? 'Продумываем сценарии...' : 'Сгенерировать Сценарии и ТЗ'}
          </button>
        </div>

      </form>

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
