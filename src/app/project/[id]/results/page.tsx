'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import {
  Image as ImageIcon, Video, Smile, ChevronDown, ChevronUp,
  Download, Share2, RotateCcw, Eye
} from 'lucide-react';

const MOCK_CREATIVES = [
  {
    id: 1,
    type: 'image',
    segment: 'Маркетологи / Digital-агентства',
    angle: 'Боль → Решение',
    hook: 'Устали копировать данные из 5 кабинетов каждый понедельник?',
    body: 'Автоматический дашборд за 15 минут. Один клик — и все метрики у вас перед глазами.',
    cta: 'Попробовать бесплатно',
    colorScheme: { bg: '#1e293b', text: '#ffffff', accent: '#3b82f6' }
  },
  {
    id: 2,
    type: 'image',
    segment: 'Маркетологи / Digital-агентства',
    angle: 'Социальное доказательство',
    hook: '+320% экономии времени на отчётность',
    body: 'Маркетолог Ирина перестала задерживаться на работе. Теперь её отчёты готовы до 10:00.',
    cta: 'Узнать как',
    colorScheme: { bg: '#0f172a', text: '#ffffff', accent: '#8b5cf6' }
  },
  {
    id: 3,
    type: 'meme',
    segment: 'Владельцы малого бизнеса (SMB)',
    angle: 'Юмор → Узнавание',
    hook: 'Когда весь отдел маркетинга говорит "всё окей", а ты видишь выписку...',
    body: 'Контролируй реальные цифры, а не красивые слайды.',
    cta: 'Получить контроль',
    colorScheme: { bg: '#fefce8', text: '#1c1917', accent: '#f59e0b' }
  },
  {
    id: 4,
    type: 'video',
    segment: 'Владельцы малого бизнеса (SMB)',
    angle: 'Трансформация',
    hook: 'Сценарий видео-крео (UGC стиль)',
    body: '0:00-0:02 — Закрытый ноут, телефон в руке...\n0:02-0:05 — "Где мои деньги?" (frustration face)\n0:05-0:15 — Открывает приложение, видит дашборд, улыбается\n0:15-0:20 — "Теперь я знаю всё в реальном времени!"\n0:20-0:25 — CTA + логотип + фоновая музыка (Lo-Fi)',
    cta: 'Смотреть видео',
    colorScheme: { bg: '#f0fdf4', text: '#14532d', accent: '#22c55e' }
  }
];

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

export default function CreativeResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlacements, setSelectedPlacements] = useState<Record<number, string>>({});

  const PLACEMENTS = [
    "Instagram Stories/Reels 9:16",
    "Instagram/Facebook Feed 1:1",
    "Instagram/Facebook Feed 4:5",
    "TikTok Vertical 9:16",
    "YouTube Shorts 9:16",
    "Telegram Square 1:1",
    "Google Ads Responsive"
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tempGeneratedCreatives');
      if (stored) {
        setCreatives(JSON.parse(stored));
      } else {
        setCreatives(MOCK_CREATIVES);
      }
    } catch (e) {
      setCreatives(MOCK_CREATIVES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filtered = filter === 'all' ? creatives : creatives.filter(c => c.type === filter);

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка результатов...</div>;


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
        {filtered.map((creative) => {
          const Icon = TYPE_ICONS[creative.type] || ImageIcon;
          const isOpen = expanded === creative.id;

          return (
            <div key={creative.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Превью заголовок */}
              <div
                onClick={() => setExpanded(isOpen ? null : creative.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  cursor: 'pointer', padding: '1.5rem',
                  background: `linear-gradient(135deg, ${creative.colorScheme.bg}, ${creative.colorScheme.bg}ee)`,
                  color: creative.colorScheme.text
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: creative.colorScheme.accent + '33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: creative.colorScheme.accent, flexShrink: 0
                }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.05em', background: creative.colorScheme.accent,
                      color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '999px'
                    }}>
                      {TYPE_LABELS[creative.type]}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>„{creative.hook}"</h3>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    Аватар: {creative.segment} · Угол: {creative.angle}
                  </p>
                </div>
                {isOpen ? <ChevronUp size={18} style={{ opacity: 0.7 }} /> : <ChevronDown size={18} style={{ opacity: 0.7 }} />}
              </div>

              {/* Развернутый блок */}
              {isOpen && (
                <div style={{ padding: '2rem', borderTop: '1px solid var(--border)', display: 'grid', gap: '1.5rem' }}>

                  {/* Текст крео */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                      📝 Текст Крео
                    </h4>
                    <div className="card" style={{ background: 'var(--secondary)', padding: '1.25rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.75rem' }}>🪝 Хук: {creative.hook}</p>
                      {creative.type === 'video' ? (
                        <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{creative.body}</pre>
                      ) : (
                        <p style={{ lineHeight: 1.6, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>{creative.body}</p>
                      )}
                      <p style={{ fontWeight: 600, color: 'var(--primary)' }}>CTA: {creative.cta} →</p>
                    </div>
                  </div>

                    {/* ТЗ для дизайнера */}
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
                              value={selectedPlacements[creative.id] || ''}
                              onChange={e => setSelectedPlacements({...selectedPlacements, [creative.id]: e.target.value})}
                            >
                              <option value="">Выберите канал и формат...</option>
                              {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600 }}>Тип крео:</span>
                            <span style={{ marginLeft: '0.5rem' }}>{TYPE_LABELS[creative.type]}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600 }}>Фон:</span>
                            <span style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: creative.colorScheme.bg, border: '1px solid #ddd' }}></span>
                              {creative.colorScheme.bg}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600 }}>Акцент:</span>
                            <span style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: creative.colorScheme.accent }}></span>
                              {creative.colorScheme.accent}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Действия */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary"><Eye size={16}/> Превью</button>
                      <button className="btn btn-secondary"><Share2 size={16}/> Поделиться</button>
                      <button className="btn btn-primary"><Download size={16}/> Скачать ТЗ</button>
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
