'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2, Eye, X, Trash2 } from 'lucide-react';

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
  onDelete?: () => void;
}

export function extractOverlay(cells: string[]): CreativeOverlay {
  const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;

  const conceptTitle = (cells[startIdx] || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .replace(/^["«„]|["»”]$/g, '')
    .trim();

  const adCopy = (cells[startIdx + 1] || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .trim();

  const brief = (cells[startIdx + 2] || cells[cells.length - 1] || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*/g, '');

  // ── Headline: find quoted text after keyword, then unquoted full line, then adCopy first chunk ──
  // Strategy 1: quoted text in «» or ""
  const hlQuoted = brief.match(
    /(?:заголовок|хук|headline|hook)[^:]*:\s*[\u00ab"\u201e\u201c\u2018]([^\u00bb"\u201d\u2019]{3,120})[\u00bb"\u201d\u2019]/i
  );

  // Strategy 2: unquoted — grab full line after keyword (no premature dash cutoff)
  const hlLine = brief.match(
    /(?:заголовок|хук|headline|hook)[^:]*:\s*([^\n]{5,120})/i
  );

  // Strategy 3: adCopy first meaningful sentence
  const adFirst = adCopy
    .split(/[.!?]+[\s\u00a0]+|<br\s*\/?>|\n/i)[0]
    ?.replace(/<[^>]+>/g, '')
    .trim();

  // Pick best match, strip trailing " — layout description" (em-dash + lowercase word)
  const stripLayoutSuffix = (s: string) =>
    s.replace(/\s*[–—]\s*[a-zа-яіїһєґ]/i, '').replace(/^["\u00ab\u201e]|["\u00bb\u201d]$/g, '').trim();

  const headline =
    stripLayoutSuffix(hlQuoted?.[1] || '') ||
    stripLayoutSuffix(hlLine?.[1] || '') ||
    stripLayoutSuffix(adFirst || '') ||
    conceptTitle;

  // ── CTA: quoted, short (≤40 chars), not a color/layout description ──
  const ctaMatch =
    brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*[\u00ab"\u201e\u201c]([^\u00bb"\u201d]{3,50})[\u00bb"\u201d]/i) ||
    brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*([^\n]{5,50})/i);
  const rawCta = ctaMatch?.[1]
    ?.replace(/\s*[–—]\s*[a-zа-яіїһєґ].*/i, '')
    .replace(/^["\u00ab\u201e]|["\u00bb\u201d]$/g, '')
    .trim();
  const isLayoutDesc = rawCta && /\u0436\u043e\u0432\u0442|\u043f\u043e\u043c\u0430\u0440\u0430\u043d\u0447|колір|фон|елемент|шрифт|розташ/i.test(rawCta);
  const cta = rawCta && !isLayoutDesc ? rawCta : undefined;

  // ── Body: first sentence of adCopy (different from headline) ──
  const firstSentence = adCopy.split(/[.!?]\s+/)[0]?.replace(/<[^>]+>/g, '').trim();
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
  onDelete,
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

    // MUST open window synchronously (before any await) — otherwise browser blocks it as popup
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Браузер заблокировал всплывающее окно. Разрешите всплывающие для этого сайта.');
      return;
    }
    // Show loading placeholder in the new tab immediately
    newWindow.document.write('<html><body style="margin:0;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:18px">Открываю...</body></html>');

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
      const dataUrl = canvas.toDataURL('image/png');
      newWindow.document.open();
      newWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Creative #${index}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}</style></head><body><img src="${dataUrl}"/></body></html>`);
      newWindow.document.close();
    } catch {
      newWindow.location.href = imageUrl;
    } finally {
      setIsOpening(false);
    }
  }, [imageUrl, index, isOpening]);

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

            {/* Delete */}
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={disabled || isReplacing}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  background: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5',
                  border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '7px',
                  padding: '0.38rem 0', fontSize: '0.68rem', fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
                  marginTop: '0.2rem'
                }}
              >
                <Trash2 size={12} /> Удалить
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
