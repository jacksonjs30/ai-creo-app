'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import {
  Image as ImageIcon, Video, Smile, ChevronDown, ChevronUp,
  Download, Share2, RotateCcw, Eye
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  image: ImageIcon,
  video: Video,
  meme: Smile
};

const TYPE_LABELS: Record<string, string> = {
  image: 'Картинка-крео',
  video: 'Видео-крео',
  meme: 'Мем-крео'
};

const PLACEMENTS = [
  'Instagram Stories/Reels 9:16',
  'Instagram/Facebook Feed 1:1',
  'Instagram/Facebook Feed 4:5',
  'TikTok Vertical 9:16',
  'YouTube Shorts 9:16',
  'Telegram Square 1:1',
  'Google Ads Responsive'
];

export default function CreativeResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [creatives, setCreatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlacements, setSelectedPlacements] = useState<Record<number, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tempGeneratedCreatives');
      if (stored) {
        setCreatives(JSON.parse(stored));
      } else {
        setCreatives([]);
      }
    } catch (e) {
      setCreatives([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filtered = filter === 'all' ? creatives : creatives.filter(c => c.type === filter);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка результатов...</div>;

  if (creatives.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <BackButton fallbackUrl={`/project/${id}/generate`} />
        <h2>Креативы не найдены</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Похоже, генерация еще не была запущена или произошла ошибка.</p>
        <Link href={`/project/${id}/generate`} className="btn btn-primary">Перейти к генерации</Link>
      </div>
    );
  }

  return (
    <div>
      <BackButton fallbackUrl={`/project/${id}/generate`} />

      <div className="flex-between mb-8" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Готовые ТЗ для Дизайнера</h1>
          <p className="page-subtitle">Сгенерировано {creatives.length} концепции по вашим аватарам</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href={`/project/${id}/generate`} className="btn btn-secondary">
            <RotateCcw size={16} /> Перегенерировать
          </Link>
          <button className="btn btn-primary">
            <Download size={16} /> Скачать все ТЗ
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['all', 'image', 'video', 'meme'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`pill ${filter === type ? 'active' : ''}`}
          >
            {type === 'all' ? 'Все' : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {filtered.map((creative, idx) => {
          const Icon = TYPE_ICONS[creative.type] || ImageIcon;
          const isOpen = expanded === idx;

          return (
            <div key={idx} className="card" style={{ overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(isOpen ? null : idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  cursor: 'pointer', padding: '1.5rem',
                  background: `linear-gradient(135deg, ${creative.colorScheme?.bg || '#f1f5f9'}, ${creative.colorScheme?.bg || '#f1f5f9'}ee)`,
                  color: creative.colorScheme?.text || 'var(--foreground)'
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: (creative.colorScheme?.accent || 'var(--primary)') + '33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: creative.colorScheme?.accent || 'var(--primary)', flexShrink: 0
                }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.05em', background: creative.colorScheme?.accent || 'var(--primary)',
                      color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '999px'
                    }}>
                      {TYPE_LABELS[creative.type] || 'Креатив'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>„{creative.hook}"</h3>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    Аватар: {creative.segment} · Угол: {creative.angle}
                  </p>
                </div>
                {isOpen ? <ChevronUp size={18} style={{ opacity: 0.7 }} /> : <ChevronDown size={18} style={{ opacity: 0.7 }} />}
              </div>

              {isOpen && (
                <div style={{ padding: '2rem', borderTop: '1px solid var(--border)', display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                      📝 Текст Крео
                    </h4>
                    <div className="card" style={{ background: 'var(--secondary)', padding: '1.25rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.75rem' }}>🪝 Хук: {creative.hook}</p>
                      <p style={{ lineHeight: 1.6, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{creative.body}</p>
                      <p style={{ fontWeight: 600, color: 'var(--primary)' }}>CTA: {creative.cta} →</p>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                      🎨 ТЗ для Дизайнера / Монтажёра
                    </h4>
                    <div className="card" style={{ background: 'var(--secondary)', padding: '1.25rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>🎯 Канал и Формат показов:</span>
                          <select
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                            value={selectedPlacements[idx] || ''}
                            onChange={e => setSelectedPlacements({ ...selectedPlacements, [idx]: e.target.value })}
                          >
                            <option value="">Выберите канал и формат...</option>
                            {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600 }}>Фон:</span>
                          <span style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: creative.colorScheme?.bg || '#eee', border: '1px solid #ddd' }}></span>
                            {creative.colorScheme?.bg || '#none'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600 }}>Акцент:</span>
                          <span style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: creative.colorScheme?.accent || '#eee' }}></span>
                            {creative.colorScheme?.accent || '#none'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary"><Eye size={16} /> Превью</button>
                    <button className="btn btn-secondary"><Share2 size={16} /> Поделиться</button>
                    <button className="btn btn-primary"><Download size={16} /> Скачать ТЗ</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .pill {
          padding: 0.4rem 1rem; border-radius: 9999px; font-size: 0.875rem;
          background: var(--secondary); border: 1px solid var(--border);
          cursor: pointer; transition: all 0.2s ease;
        }
        .pill:hover { background: var(--secondary-hover); }
        .pill.active { background: var(--primary); color: white; border-color: var(--primary); }
      `}</style>
    </div>
  );
}
