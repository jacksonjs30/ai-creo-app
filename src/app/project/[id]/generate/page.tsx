'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { Image as ImageIcon, Video, Smile, LayoutTemplate, Palette, Mic, CheckCircle2, Lock, Loader2 } from 'lucide-react';

const CREATIVE_TYPES = [
  { id: 'image', name: 'Картинка + текст', icon: ImageIcon },
  { id: 'video', name: 'Видео-крео', icon: Video },
  { id: 'meme', name: 'Мем-крео', icon: Smile }
];

export default function GenerateCreatives({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();


  
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [variantsCount, setVariantsCount] = useState<number>(3);
  
  // Дополнительные параметры
  const [styleDesc, setStyleDesc] = useState('');
  const [color1, setColor1] = useState('#3b82f6');
  const [color2, setColor2] = useState('#8b5cf6');
  const [voiceStyle, setVoiceStyle] = useState('Нейтральный');



  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setIsGenerating(true);

    try {
      const storedAvatars = localStorage.getItem('tempGeneratedAvatars');
      const storedBrief = localStorage.getItem('tempBrief');

      const avatars = storedAvatars ? JSON.parse(storedAvatars) : [];
      const briefContext = storedBrief ? JSON.parse(storedBrief) : {};

      const response = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          count: variantsCount,
          styleDesc,
          voiceStyle,
          colorScheme: { bg: color1, accent: color2 },
          briefContext,
          avatars
        }),
      });

      const data = await response.json();
      
      if (data.creatives) {
        localStorage.setItem('tempGeneratedCreatives', JSON.stringify(data.creatives));
      }
      
      router.push(`/project/${id}/results`);
    } catch (e) {
      console.error(e);
      alert('Ошибка при генерации');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <BackButton fallbackUrl={`/project/${id}`} />
      
      <div className="mb-8">
        <h1 className="page-title">Выбор формата креативов</h1>
        <p className="page-subtitle">Выберите формат для генерации сценариев и ТЗ.</p>
      </div>

      <form onSubmit={handleGenerate} className="grid-layout">
        
        {/* Базовые параметры */}
        <section className="card">
          <h3 className="card-title mb-6">1. Вид креатива (один за сессию)</h3>
          
          <div className="types-grid">
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
                >
                  <div className="icon-wrapper">
                    <Icon size={24} />
                  </div>
                  <span className="type-name">{type.name}</span>
                  
                  {isSelected && <CheckCircle2 size={18} className="check-icon" />}
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <h3 className="card-title mb-4">2. Количество вариантов</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input 
                type="range" 
                min="1" max="5" 
                disabled={isGenerating}
                value={variantsCount} 
                onChange={(e) => setVariantsCount(parseInt(e.target.value))} 
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 600, minWidth: '30px' }}>{variantsCount}</span>
            </div>
            <p className="form-help mt-2">Выбор платформы и размеров (Instagram, TikTok и т.д.) будет доступен на следующем шаге после создания сценариев.</p>
          </div>
        </section>

        {/* Опциональные настройки в зависимости от формата */}
        {selectedType && (
          <section className="card">
            <h3 className="card-title mb-6">3. Опциональные настройки</h3>
            
            {(selectedType === 'image' || selectedType === 'meme') && (
              <div className="settings-grid">
                <div className="form-group">
                  <label><LayoutTemplate size={16} /> Стиль оформления / Брендбук</label>
                  <textarea rows={3} disabled={isGenerating} value={styleDesc} onChange={e => setStyleDesc(e.target.value)} placeholder="Минимализм, корпоративный, тёмный..."></textarea>
                </div>
                <div className="form-group">
                  <label><Palette size={16} /> Цвета бренда</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input type="color" disabled={isGenerating} value={color1} onChange={e => setColor1(e.target.value)} className="color-picker" />
                    <input type="color" disabled={isGenerating} value={color2} onChange={e => setColor2(e.target.value)} className="color-picker" />
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'video' && (
              <div className="settings-grid">
                <div className="form-group">
                  <label><Mic size={16} /> Стиль закадрового голоса (VO)</label>
                  <select disabled={isGenerating} value={voiceStyle} onChange={e => setVoiceStyle(e.target.value)}>
                    <option>Нейтральный</option>
                    <option>Эмоциональный (WOW-эффект)</option>
                    <option>Строгий (Корпоративный)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Фоновая музыка / Sound Design</label>
                  <select disabled={isGenerating}>
                    <option>Lo-Fi Chill</option>
                    <option>Corporate Tech</option>
                    <option>Dynamic Beat</option>
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={!selectedType || isGenerating}
            style={{ padding: '1rem 2rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : null}
            {isGenerating ? 'Генерируем результаты...' : 'Сгенерировать ТЗ и Креативы'}
          </button>
        </div>

      </form>

    </div>
  );
}
