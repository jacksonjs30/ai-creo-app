'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

export interface CreativeOverlay {
  /** Main headline from the TZ (ЗАГОЛОВОК/Хук) */
  headline: string;
  /** Supporting body / pain text */
  body?: string;
  /** CTA button text */
  cta?: string;
}

interface CreativeCardProps {
  /** Index label, e.g. "#1" */
  index: number;
  /** Background image URL from Supabase */
  imageUrl: string;
  /** Text overlay data parsed from the TZ */
  overlay: CreativeOverlay;
  /** Whether replace is loading for this specific card */
  isReplacing?: boolean;
  /** Disable all actions while another generation is running */
  disabled?: boolean;
  onReplace?: () => void;
}

/** Extract overlay texts from row cells (concept title, ad copy, design brief) */
export function extractOverlay(cells: string[]): CreativeOverlay {
  // Skip leading row-number cell
  const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;
  const conceptName = (cells[startIdx] || '').replace(/<br\s*\/?>/gi, ' ').replace(/\*\*/g, '').trim();
  const adCopy = (cells[startIdx + 1] || '').replace(/<br\s*\/?>/gi, '\n').replace(/\*\*/g, '').trim();
  const brief = (cells[startIdx + 2] || cells[cells.length - 1] || '').replace(/<br\s*\/?>/gi, '\n').replace(/\*\*/g, '');

  // Extract ЗАГОЛОВОК line from brief
  const headlineMatch = brief.match(/(?:заголовок|headline|хук)[^:]*:\s*"?([^"\n]+)"?/i);
  const headline = headlineMatch?.[1]?.trim() || conceptName;

  // Extract CTA
  const ctaMatch = brief.match(/(?:cta|кнопка|call to action)[^:]*:\s*"?([^"\n]+)"?/i);
  const cta = ctaMatch?.[1]?.trim();

  // First line of adCopy as body (if different from headline)
  const firstLine = adCopy.split('\n')[0]?.trim();
  const body = firstLine && firstLine !== headline ? firstLine : undefined;

  return { headline, body, cta };
}

export function CreativeCard({
  index,
  imageUrl,
  overlay,
  isReplacing,
  disabled,
  onReplace,
}: CreativeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      // Dynamically import html2canvas to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2, // 2x for crisp export
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `creative_${index}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
      // Fallback: open image in new tab
      window.open(imageUrl, '_blank');
    } finally {
      setIsExporting(false);
    }
  }, [imageUrl, index, isExporting]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {/* Card with overlay */}
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #c7d2fe',
          aspectRatio: '1/1',
          background: '#1e1b4b',
          boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Background image */}
        <img
          src={imageUrl}
          alt={`Креатив #${index}`}
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Gradient scrim at bottom for text readability */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '65%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Text overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          pointerEvents: 'none',
        }}>
          {/* Headline */}
          <p style={{
            margin: 0,
            fontSize: 'clamp(0.7rem, 2.2cqw, 0.95rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            letterSpacing: '-0.01em',
            wordBreak: 'break-word',
            fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
          }}>
            {overlay.headline}
          </p>

          {/* Body */}
          {overlay.body && (
            <p style={{
              margin: 0,
              fontSize: 'clamp(0.55rem, 1.6cqw, 0.72rem)',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.3,
              textShadow: '0 1px 3px rgba(0,0,0,0.7)',
              wordBreak: 'break-word',
              fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
            }}>
              {overlay.body}
            </p>
          )}

          {/* CTA */}
          {overlay.cta && (
            <span style={{
              display: 'inline-block',
              marginTop: '0.25rem',
              alignSelf: 'flex-start',
              background: '#f59e0b',
              color: '#1c1917',
              fontSize: 'clamp(0.5rem, 1.4cqw, 0.65rem)',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
            }}>
              {overlay.cta}
            </span>
          )}
        </div>

        {/* Index badge */}
        <div style={{
          position: 'absolute', top: '0.35rem', left: '0.35rem',
          background: 'rgba(67,56,202,0.85)', color: 'white',
          fontSize: '0.62rem', fontWeight: 700,
          padding: '0.12rem 0.4rem', borderRadius: '4px',
          backdropFilter: 'blur(4px)',
        }}>
          #{index}
        </div>

        {/* Hover action overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(15,10,60,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem',
            backdropFilter: 'blur(2px)',
          }}>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'white', color: '#4338ca',
                border: 'none', borderRadius: '6px',
                padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isExporting
                ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Экспорт...</>
                : <><Download size={12} /> Скачать</>
              }
            </button>
            {onReplace && (
              <button
                onClick={onReplace}
                disabled={disabled || isReplacing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px',
                  padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: 700,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {isReplacing
                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Замена</>
                  : <><RefreshCw size={12} /> Заменить</>
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
