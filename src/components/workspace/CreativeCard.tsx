'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2, Eye, X } from 'lucide-react';

export interface CreativeOverlay {
  headline: string;
  body?: string;
  cta?: string;
}

interface CreativeCardProps {
  index: number;
  imageUrl: string;
  overlay: CreativeOverlay;
  isReplacing?: boolean;
  disabled?: boolean;
  onReplace?: () => void;
}

export function extractOverlay(cells: string[]): CreativeOverlay {
  const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;

  const conceptTitle = (cells[startIdx] || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .trim();

  const adCopy = (cells[startIdx + 1] || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .trim();

  const brief = (cells[startIdx + 2] || cells[cells.length - 1] || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*/g, '');

  // ── Headline: only text in quotes after ЗАГОЛОВОК/Хук ────────────────────
  const hlMatch =
    brief.match(/(?:заголовок|headline|хук)[^:]*:\s*[«"„""]([^»""]{3,80})[»""]/i) ||
    brief.match(/(?:заголовок|headline|хук)[^:]*:\s*([^–—\n]{5,80})/i);
  const headline = (hlMatch?.[1] ?? conceptTitle)
    .replace(/\s*[–—].*/, '')   // cut off everything after dash (layout desc)
    .replace(/^["«„]|["»"]$/g, '')
    .trim() || conceptTitle;

  // ── CTA: quoted, short (≤40 chars), not a color/layout description ────────
  const ctaMatch =
    brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*[«"„""]([^»""]{3,40})[»""]/i) ||
    brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*([^–—\n]{5,40})/i);
  const rawCta = ctaMatch?.[1]
    ?.replace(/\s*[–—].*/, '')
    .replace(/^["«„]|["»"]$/g, '')
    .trim();
  // Reject if looks like color/layout description
  const isLayoutDesc = rawCta && /жовт|помаранч|колір|фон|елемент|шрифт|розташ/i.test(rawCta);
  const cta = rawCta && !isLayoutDesc ? rawCta : undefined;

  // ── Body: first sentence of adCopy ────────────────────────────────────────
  const firstSentence = adCopy.split(/[.!?]\s+/)[0]?.trim();
  const body = firstSentence && firstSentence.length > 8 && firstSentence !== headline
    ? firstSentence
    : undefined;

  return { headline, body, cta };
}



// ── Main CreativeCard component ─────────────────────────────────────────────
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
  const [isOpening, setIsOpening] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    setHovered(false);
    await new Promise(r => setTimeout(r, 80));
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `creative_${index}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      window.open(imageUrl, '_blank');
    } finally {
      setIsExporting(false);
    }
  }, [imageUrl, index, isExporting]);

  const handleOpenFull = useCallback(async () => {
    if (!cardRef.current || isOpening) return;
    setIsOpening(true);
    setHovered(false);
    await new Promise(r => setTimeout(r, 80));
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: null,
      });
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      });
    } catch {
      window.open(imageUrl, '_blank');
    } finally {
      setIsOpening(false);
    }
  }, [imageUrl, isOpening]);

  return (
    <>

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
          userSelect: 'none',
          containerType: 'inline-size',
        }}
      >
        {/* AI-generated background */}
        <img
          src={imageUrl}
          alt={`Креатив #${index}`}
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Full-card dim — suppresses AI text in middle of image */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.30)',
          pointerEvents: 'none',
        }} />

        {/* Heavy bottom gradient for text area */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '75%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* CSS text overlay — perfect Cyrillic */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0.55rem 0.6rem 0.6rem',
          display: 'flex', flexDirection: 'column', gap: '0.2rem',
          pointerEvents: 'none',
        }}>
          <p style={{
            margin: 0,
            fontSize: 'clamp(0.72rem, 7cqw, 1rem)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.15,
            textShadow: '0 2px 8px rgba(0,0,0,1)',
            wordBreak: 'break-word',
            fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {overlay.headline}
          </p>
          {overlay.body && (
            <p style={{
              margin: 0,
              fontSize: 'clamp(0.58rem, 4cqw, 0.72rem)',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.3,
              textShadow: '0 1px 4px rgba(0,0,0,1)',
              wordBreak: 'break-word',
              fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {overlay.body}
            </p>
          )}
          {overlay.cta && (
            <span style={{
              display: 'inline-block', marginTop: '0.15rem',
              alignSelf: 'flex-start',
              background: '#f59e0b', color: '#1c1917',
              fontSize: 'clamp(0.52rem, 3.5cqw, 0.65rem)',
              fontWeight: 800,
              padding: '0.12rem 0.45rem', borderRadius: '4px',
              fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
              maxWidth: '92%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {overlay.cta}
            </span>
          )}
        </div>

        {/* Index badge */}
        <div style={{
          position: 'absolute', top: '0.3rem', left: '0.3rem',
          background: 'rgba(67,56,202,0.9)', color: 'white',
          fontSize: '0.58rem', fontWeight: 700,
          padding: '0.1rem 0.32rem', borderRadius: '4px',
        }}>
          #{index}
        </div>

        {/* Hover actions — inside overflow:hidden, never overflow */}
        {hovered && !isExporting && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(5,0,40,0.65)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'stretch', justifyContent: 'center',
            gap: '0.35rem', padding: '0.6rem',
            backdropFilter: 'blur(4px)',
          }}>
            {/* Preview */}
            <button
              onClick={handleOpenFull}
              disabled={isOpening}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                background: 'white', color: '#4338ca',
                border: 'none', borderRadius: '7px',
                padding: '0.42rem 0', fontSize: '0.72rem', fontWeight: 700,
                cursor: isOpening ? 'wait' : 'pointer', width: '100%',
              }}
            >
              {isOpening
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Открываю…</>
                : <><Eye size={13} /> В новой вкладке</>
              }
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                background: '#6366f1', color: 'white',
                border: 'none', borderRadius: '7px',
                padding: '0.42rem 0', fontSize: '0.72rem', fontWeight: 700,
                cursor: 'pointer', width: '100%',
              }}
            >
              <Download size={13} /> Скачать PNG
            </button>

            {/* Replace */}
            {onReplace && (
              <button
                onClick={onReplace}
                disabled={disabled || isReplacing}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.25)', borderRadius: '7px',
                  padding: '0.38rem 0', fontSize: '0.68rem', fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
                }}
              >
                {isReplacing
                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Заменяю…</>
                  : <><RefreshCw size={12} /> Перегенерировать</>
                }
              </button>
            )}
          </div>
        )}

        {/* Export spinner */}
        {isExporting && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(5,0,40,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '0.75rem', fontWeight: 700, gap: '0.4rem',
          }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Экспортирую…
          </div>
        )}
      </div>
    </>
  );
}
