'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Image as ImageIcon, Layout, Type, Palette } from 'lucide-react';
import { toPng } from 'html-to-image';

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const scriptId = params.scriptId as string;

  const [project, setProject] = useState<any>(null);
  const [script, setScript] = useState<any>(null);
  
  // Data from parsing
  const [concepts, setConcepts] = useState<any[]>([]);
  const [activeConceptIdx, setActiveConceptIdx] = useState(0);

  // Canvas Settings
  const [format, setFormat] = useState<'1:1' | '9:16'>('1:1');
  const [bgType, setBgType] = useState<'color' | 'image'>('color');
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  // Design Settings
  const [colors, setColors] = useState({
    bg: '#f8fafc',
    text: '#1e293b',
    accent: '#3b82f6'
  });

  // Text Elements
  const [headline, setHeadline] = useState('Хук (Заголовок)');
  const [bodyText, setBodyText] = useState('Основной текст боли или решения, который зацепит вашего аватара.');
  const [ctaText, setCtaText] = useState('Узнать подробнее');

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      // Load project
      let projectName = 'Проект';
      if (id !== 'temp-id') {
        try {
          const res = await fetch(`/api/projects?id=${id}`);
          if (res.ok) {
            const data = await res.json();
            projectName = data.project?.name || data.project?.productName || 'Проект';
            setProject(data.project);
          }
        } catch (e) {}
      }

      // Load Script
      const scripts = JSON.parse(localStorage.getItem(`projectScripts_${id}`) || '[]');
      const found = scripts.find((s: any) => s.id === scriptId);
      
      if (!found) {
        alert('Сценарий не найден');
        router.push(`/project/${id}/scripts`);
        return;
      }
      
      setScript(found);

      // Parse Markdown Table
      if (found.content) {
        try {
          const lines = found.content.split('\n');
          const tableLines = lines.filter((line: string) => line.trim().startsWith('|') && !line.includes('---|'));
          
          if (tableLines.length > 1) { // has header + data
            const parsed = tableLines.slice(1).map((row: string) => {
              const cols = row.split('|').map((c: string) => c.trim());
              return {
                title: cols[2] || 'Концепция',
                text: cols[3] || '',
                brief: cols[4] || ''
              };
            });
            setConcepts(parsed);
            
            // Auto-fill from first concept
            fillFromConcept(parsed[0]);
            
            // Try to extract colors from script config if exists
            if (found.colors) {
              setColors({
                bg: found.colors.main || '#f8fafc',
                text: found.colors.secondary || '#1e293b',
                accent: found.colors.accent || '#3b82f6'
              });
            }
          }
        } catch (e) {
          console.error("Error parsing markdown table", e);
        }
      }
    }
    loadData();
  }, [id, scriptId]);

  const fillFromConcept = (concept: any) => {
    let cleanText = (concept.text || '').replace(/<br\s*\/?>/gi, '\n').replace(/\*\*/g, '').trim();
    
    const lines = cleanText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setHeadline(lines[0]);
      setBodyText(lines.slice(1).join('\n\n'));
    } else {
      setHeadline(concept.title || 'Заголовок');
      setBodyText(cleanText);
    }
    let cta = 'Узнать подробнее';
    if (concept.brief) {
      // Ищем строку вида "- CTA (Кнопка): "Текст"" или похожие
      const ctaMatch = concept.brief.match(/CTA.*?:\s*["'«]?([^"'\n»]+)["'»]?/i);
      if (ctaMatch && ctaMatch[1]) {
        cta = ctaMatch[1].trim();
      }
    }
    setCtaText(cta);
  };

  const handleConceptChange = (idx: number) => {
    setActiveConceptIdx(idx);
    fillFromConcept(concepts[idx]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target?.result as string);
        setBgType('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { cacheBust: true, quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `creo_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Ошибка при скачивании картинки');
    }
  };

  if (!script) return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка мастерской...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/project/${id}/scripts`} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Мастерская Креативов</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Настраивайте текст и визуал прямо в браузере</p>
          </div>
        </div>
        
        <button 
          onClick={downloadImage}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Download size={20} />
          Скачать PNG
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* LEFT PANEL: CONTROLS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Concepts Selector */}
          {concepts.length > 0 && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                <Layout size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                Выбор концепции
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {concepts.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleConceptChange(i)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      border: activeConceptIdx === i ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      background: activeConceptIdx === i ? '#eff6ff' : 'white',
                      color: activeConceptIdx === i ? '#1d4ed8' : '#475569',
                      fontWeight: activeConceptIdx === i ? 600 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    Вариант {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: 0 }} />

          {/* Text Editor */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>
              <Type size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
              Тексты
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Заголовок (Хук)</label>
                <input 
                  type="text" 
                  value={headline} 
                  onChange={e => setHeadline(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Основной текст</label>
                <textarea 
                  value={bodyText} 
                  onChange={e => setBodyText(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Кнопка (CTA)</label>
                <input 
                  type="text" 
                  value={ctaText} 
                  onChange={e => setCtaText(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: 0 }} />

          {/* Design & Colors */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>
              <Palette size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
              Визуал
            </label>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button 
                onClick={() => setFormat('1:1')}
                style={{ flex: 1, padding: '0.5rem', border: format === '1:1' ? '2px solid #3b82f6' : '1px solid #cbd5e1', borderRadius: '8px', background: format === '1:1' ? '#eff6ff' : 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Квадрат (1:1)
              </button>
              <button 
                onClick={() => setFormat('9:16')}
                style={{ flex: 1, padding: '0.5rem', border: format === '9:16' ? '2px solid #3b82f6' : '1px solid #cbd5e1', borderRadius: '8px', background: format === '9:16' ? '#eff6ff' : 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Истории (9:16)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Фон</label>
                <input type="color" value={colors.bg} onChange={e => setColors({...colors, bg: e.target.value})} style={{ width: '100%', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Текст</label>
                <input type="color" value={colors.text} onChange={e => setColors({...colors, text: e.target.value})} style={{ width: '100%', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Акцент</label>
                <input type="color" value={colors.accent} onChange={e => setColors({...colors, accent: e.target.value})} style={{ width: '100%', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Картинка на фон (опционально)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', justifyContent: 'center' }}>
                <ImageIcon size={18} color="#64748b" />
                <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                  {bgImage ? 'Изменить картинку' : 'Загрузить фото/мем'}
                </span>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
              {bgImage && (
                <button 
                  onClick={() => { setBgImage(null); setBgType('color'); }}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', color: '#ef4444', background: 'none', border: 'none', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' }}
                >
                  Удалить фон
                </button>
              )}
            </div>

          </div>

        </div>

        {/* RIGHT PANEL: PREVIEW CANVAS */}
        <div style={{ display: 'flex', justifyContent: 'center', background: '#f1f5f9', padding: '2rem', borderRadius: '24px', minHeight: '800px', alignItems: 'center' }}>
          
          <div 
            ref={canvasRef}
            style={{
              width: format === '1:1' ? '600px' : '450px',
              height: format === '1:1' ? '600px' : '800px',
              backgroundColor: colors.bg,
              backgroundImage: bgImage ? `url(${bgImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: format === '1:1' ? '3rem' : '2.5rem',
              fontFamily: '"Inter", sans-serif'
            }}
          >
            {/* Dark/Light overlay for better text readability if image exists */}
            {bgImage && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
            )}

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {headline && (
                  <h2 style={{ 
                    fontSize: format === '1:1' ? '2.5rem' : '2.25rem', 
                    fontWeight: 900, 
                    color: bgImage ? '#ffffff' : colors.accent,
                    marginBottom: '1.5rem',
                    lineHeight: 1.1,
                    textTransform: 'uppercase',
                    textShadow: bgImage ? '0 2px 10px rgba(0,0,0,0.5)' : 'none'
                  }}>
                    {headline}
                  </h2>
                )}

                {bodyText && (
                  <p style={{ 
                    fontSize: format === '1:1' ? '1.5rem' : '1.35rem', 
                    fontWeight: 500, 
                    color: bgImage ? '#f8fafc' : colors.text,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    textShadow: bgImage ? '0 2px 10px rgba(0,0,0,0.5)' : 'none'
                  }}>
                    {bodyText}
                  </p>
                )}
              </div>

              {ctaText && (
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                  <div style={{
                    backgroundColor: colors.accent,
                    color: '#ffffff',
                    padding: '1.25rem 2rem',
                    borderRadius: '16px',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    display: 'inline-block',
                    width: '100%'
                  }}>
                    {ctaText}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
