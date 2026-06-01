'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Image as ImageIcon, Video, Smile, LayoutTemplate, Palette, Mic, CheckCircle2, Lock, Loader2, PlayCircle, FileText, Camera, User, Upload, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { get, set } from 'idb-keyval';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const CREATIVE_TYPES = [
  { id: 'Відео-крео на основі JTBD + CJM', name: 'Відео-крео (JTBD + CJM)', icon: PlayCircle, isVideo: true },
  { id: 'Текст на білому фоні (статична картинка)', name: 'Текст на білому фоні', icon: FileText, isVideo: false },
  { id: 'Крео з фото/графікою + текст', name: 'Фото + текст', icon: Camera, isVideo: false },
  { id: 'Реалістичне фото-крео (Real-Photo Creo)', name: 'Реалістичне фото (Real-Photo)', icon: Camera, isVideo: false },
  { id: 'Крео в стилі Specsavers', name: 'Стиль Specsavers', icon: Video, isVideo: true },
  { id: 'Інфографіка', name: 'Інфографіка', icon: LayoutTemplate, isVideo: false },
  { id: 'Карусель (5-10 слайдів)', name: 'Карусель (5-10 слайдів)', icon: LayoutTemplate, isVideo: false },
  { id: 'Мем-крео', name: 'Мем-крео', icon: Smile, isVideo: false },
  { id: 'Відео-відгук (Testimonial-video)', name: 'Відео-відгук', icon: Video, isVideo: true },
  { id: 'Коротке демо-відео (screen recording)', name: 'Демо-відео (скрін)', icon: Video, isVideo: true }
];

const TONE_OPTIONS = [
  { id: 'Дружелюбный → тёплый, разговорный, на "ты", без давления', label: 'Дружелюбный' },
  { id: 'Экспертный → уверенный, фактологичный, данные и факты, авторитет', label: 'Экспертный' },
  { id: 'Провокационный → острый хук, вызов статусу-кво', label: 'Провокационный' },
  { id: 'Вдохновляющий → эмоциональный подъём, трансформация', label: 'Вдохновляющий' }
];

const LANGUAGE_OPTIONS = ['Українська', 'Русский', 'English'];

export default function GenerateCreative({ id }: { id: string }) {
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
  const [promoOffer, setPromoOffer] = useState('');

  const [useColors, setUseColors] = useState(false);
  const [mainColor, setMainColor] = useState('#3b82f6');
  const [secondColor, setSecondColor] = useState('#1e293b');
  const [accentColor, setAccentColor] = useState('#f59e0b');

  // Logo States
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<'TL' | 'TR' | 'BL' | 'BR'>('TR');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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
           if (loadedProject.logoUrl) setLogoPreviewUrl(loadedProject.logoUrl);
           if (loadedProject.logoPosition) setLogoPosition(loadedProject.logoPosition);
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
          promoOffer: promoOffer.trim() || undefined,
          colors: useColors ? { main: mainColor, secondary: secondColor, accent: accentColor } : undefined
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при генерации сценариев');
      }
      
      // Сохраняем скрипт локально в массив проекта, объединяя с данными из БД
      const scriptsKey = `projectScripts_${id}`;
      // fallback to localStorage if nothing in IDB
      let existingLocal = await get(scriptsKey);
      if (!existingLocal) {
        const oldLocal = localStorage.getItem(scriptsKey);
        existingLocal = oldLocal ? JSON.parse(oldLocal) : [];
      }
      
      // Upload Logo if new one selected
      let finalLogoUrl = logoPreviewUrl;
      if (logoFile) {
        setIsUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${id}/${Date.now()}_logo.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('creatives')
          .upload(`logos/${fileName}`, logoFile, { upsert: true });
        
        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          alert('Ошибка загрузки логотипа: ' + uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage.from('creatives').getPublicUrl(`logos/${fileName}`);
          finalLogoUrl = publicUrl;
        }
        setIsUploadingLogo(false);
      }

      const dbScripts = project?.brief?.scripts || [];
      const generatedScript = {
        ...data.script,
        id: `script_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date().toISOString()
      };

      const newBrief = {
        ...project?.brief,
        productName,
        toneOfVoice,
        language,
        focusDirection,
        useColors,
        mainColor,
        secondColor,
        accentColor,
        scripts: [
          generatedScript,
          ...dbScripts
        ]
      };

      // Збереження в Supabase
      if (id && id !== 'temp-id') {
        try {
          await fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id, 
              brief: newBrief,
              logoUrl: finalLogoUrl,
              logoPosition: logoPosition
            })
          });
        } catch (dbErr) {
          console.error('Failed to sync script to DB:', dbErr);
        }
      }

      // ВАЖНО: сохраняем локально, чтобы ScriptStudio сразу нашёл скрипты
      const localStorageKey = `projectScripts_${id}`;
      let existingLoc = await get(localStorageKey);
      if (!existingLoc) {
        const oldLocal = localStorage.getItem(localStorageKey);
        existingLoc = oldLocal ? JSON.parse(oldLocal) : [];
      }
      const allScripts = [generatedScript, ...existingLoc.filter((s: any) => s.id !== generatedScript.id)];
      await set(localStorageKey, allScripts);

      router.push(`/project/${id}?tab=studio&view=scripts`);
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при генерации: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Новая генерация ТЗ</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Умный помощник для создания креативов на основе JTBD + CJM.</p>
      </div>

      <form onSubmit={handleGenerate} className="grid-layout">
        
        <section className="card shadow-sm" style={{ gridColumn: '1 / -1', borderRadius: '16px', padding: '2rem' }}>
          <h3 className="card-title mb-4" style={{ fontSize: '1.25rem' }}>1. Выберите целевой аватар (сегмент)</h3>
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

        <section className="card shadow-sm" style={{ borderRadius: '16px', padding: '2rem' }}>
          <h3 className="card-title mb-6" style={{ fontSize: '1.25rem' }}>2. Формат креатива (один за сессию)</h3>
          
          <div className="types-grid" style={{ gridTemplateColumns: '1fr' }}>
            {CREATIVE_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              const Icon = type.icon;
              
              return (
                <button
                  key={type.id}
                  type="button"
                  disabled={isGenerating || type.isVideo}
                  onClick={() => setSelectedType(type.id)}
                  className={`type-card ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    justifyContent: 'flex-start', padding: '1rem 1.5rem', flexDirection: 'row', textAlign: 'left', minHeight: 'auto',
                    opacity: type.isVideo ? 0.4 : 1, cursor: type.isVideo ? 'not-allowed' : 'pointer'
                  }}
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

        <section className="card shadow-sm" style={{ borderRadius: '16px', padding: '2rem' }}>
          <h3 className="card-title mb-6" style={{ fontSize: '1.25rem' }}>3. Параметры генерации</h3>
          
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
              <label>Акция / Спецпредложение (опционально)</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '-0.25rem' }}>
                Добавьте кратко суть акции если есть (данный текст будет размещен на креативе).
              </p>
              <input 
                type="text" 
                placeholder="Например: Скидка -20% до конца недели"
                disabled={isGenerating}
                value={promoOffer} 
                onChange={e => setPromoOffer(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Количество вариантов для каждого ТЗ</label>
                  <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '1.25rem' }}>{variantsCount} шт.</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  disabled={isGenerating}
                  value={variantsCount} 
                  onChange={e => setVariantsCount(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', height: '6px', background: '#e2e8f0', borderRadius: '8px', appearance: 'none' }}
                />
              </div>
            </div>

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
            
            <hr style={{ margin: '2rem 0', borderColor: '#e2e8f0' }} />

            <div className="form-group">
              <label>Водяной знак / Логотип (опционально)</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Загрузите логотип (PNG/JPG), который ИИ автоматически наложит на готовые креативы в выбранном углу.
              </p>
              
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      disabled={isGenerating || isUploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      style={{
                        position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                      }}
                    />
                    
                    {logoPreviewUrl ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={logoPreviewUrl} alt="Logo preview" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                        <button 
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLogoFile(null); setLogoPreviewUrl(null); }}
                          style={{ position: 'absolute', top: -10, right: -10, background: '#ef4444', color: 'white', borderRadius: '50%', padding: '4px', border: 'none' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: '#64748b' }}>
                        <Upload size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Нажмите или перетащите файл</p>
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>PNG, JPG до 5 MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {logoPreviewUrl && (
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Выберите угол для логотипа:</label>
                    <div style={{ 
                      width: '160px', height: '120px', 
                      background: '#e2e8f0', borderRadius: '8px', 
                      position: 'relative', padding: '8px',
                      border: '2px solid #cbd5e1'
                    }}>
                      {/* TL */}
                      <div 
                        onClick={() => setLogoPosition('TL')}
                        style={{ position: 'absolute', top: '8px', left: '8px', width: '30px', height: '30px', background: logoPosition === 'TL' ? '#3b82f6' : 'rgba(255,255,255,0.7)', borderRadius: '4px', cursor: 'pointer', border: logoPosition === 'TL' ? '2px solid #2563eb' : '2px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {logoPosition === 'TL' && <ImageIcon size={14} color="white" />}
                      </div>
                      {/* TR */}
                      <div 
                        onClick={() => setLogoPosition('TR')}
                        style={{ position: 'absolute', top: '8px', right: '8px', width: '30px', height: '30px', background: logoPosition === 'TR' ? '#3b82f6' : 'rgba(255,255,255,0.7)', borderRadius: '4px', cursor: 'pointer', border: logoPosition === 'TR' ? '2px solid #2563eb' : '2px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {logoPosition === 'TR' && <ImageIcon size={14} color="white" />}
                      </div>
                      {/* BL */}
                      <div 
                        onClick={() => setLogoPosition('BL')}
                        style={{ position: 'absolute', bottom: '8px', left: '8px', width: '30px', height: '30px', background: logoPosition === 'BL' ? '#3b82f6' : 'rgba(255,255,255,0.7)', borderRadius: '4px', cursor: 'pointer', border: logoPosition === 'BL' ? '2px solid #2563eb' : '2px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {logoPosition === 'BL' && <ImageIcon size={14} color="white" />}
                      </div>
                      {/* BR */}
                      <div 
                        onClick={() => setLogoPosition('BR')}
                        style={{ position: 'absolute', bottom: '8px', right: '8px', width: '30px', height: '30px', background: logoPosition === 'BR' ? '#3b82f6' : 'rgba(255,255,255,0.7)', borderRadius: '4px', cursor: 'pointer', border: logoPosition === 'BR' ? '2px solid #2563eb' : '2px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {logoPosition === 'BR' && <ImageIcon size={14} color="white" />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </section>

        <div style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isGenerating || isUploadingLogo}
            style={{ width: '100%', padding: '1.25rem', fontSize: '1.15rem', borderRadius: '12px' }}
          >
            {isGenerating ? 'Продумываем сценарии...' : 'Сгенерировать ТЗ и Сценарии'}
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
