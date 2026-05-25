'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

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

/**
 * Extract overlay texts from row cells.
 * cells = [№?, conceptTitle, adCopyText, designBrief]
 *
 * headline → quoted text after ЗАГОЛОВОК/Хук in brief → fallback: conceptTitle
 * cta      → quoted text after CTA/Кнопка in brief
 * body     → first real sentence of adCopy
 */
export function extractOverlay(cells: string[]): CreativeOverlay {
  const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;

  const conceptTitle = (cells[startIdx] || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .trim();

  const adCopy = (cells[startIdx + 1] || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*/g, '')
    .trim();

  const brief = (cells[startIdx + 2] || cells[cells.length - 1] || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*/g, '');

  // ── Headline: take ONLY the text inside quotes after ЗАГОЛОВОК/Хук ───────
  // Example: ЗАГОЛОВОК (Хук): "СТОП! Зливаєш бюджет?" – великий жирний...
  // We want only: СТОП! Зливаєш бюджет?
  const hlQuoted = brief.match(/(?:заголовок|headline|хук)[^:]*:\s*[«"„""]([^»""]+)[»""]/i);
  const hlFallback = brief.match(/(?:заголовок|headline|хук)[^:]*:\s*([^–—\n]{5,80})/i);
  const headline =
    hlQuoted?.[1]?.trim() ||
    hlFallback?.[1]?.replace(/\s*[–—].*/, '').replace(/^["«„]|["»"]$/g, '').trim() ||
    conceptTitle;

  // ── CTA: quoted text after CTA/Кнопка ────────────────────────────────────
  const ctaQuoted = brief.match(/(?:\bcta\b|кнопка|call to action)[^:]*:\s*[«"„""]([^»""]+)[»""]/i);
  const ctaFallback = brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*([^–—\n]{3,50})/i);
  const rawCta =
    ctaQuoted?.[1]?.trim() ||
    ctaFallback?.[1]?.replace(/\s*[–—].*/, '').replace(/^["«„]|["»"]$/g, '').trim();
  // Discard CTA if it looks like a layout description (>50 chars or no verb)
  const cta = rawCta && rawCta.length <= 50 ? rawCta : undefined;

  // ── Body: first meaningful line of adCopy ─────────────────────────────────
  const firstLine = adCopy
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 8 && l !== headline);
  const body = firstLine;

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

  // Download: composite background + CSS text overlay via html2canvas
  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    // Temporarily hide hover UI before capturing
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
      // Fallback: just open raw image
      window.open(imageUrl, '_blank');
    } finally {
      setIsExporting(false);
    }
  }, [imageUrl, index, isExporting]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',           // ← clips everything inside, incl. hover buttons
        border: '1px solid #c7d2fe',
        aspectRatio: '1/1',
        background: '#1e1b4b',
        boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
        userSelect: 'none',
        containerType: 'inline-size', // enables cqw units
      }}
    >
      {/* AI-generated background image */}
      <img
        src={imageUrl}
        alt={`Креатив #${index}`}
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Heavy gradient scrim — covers AI-generated text at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '72%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 45%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Also a thin top scrim so AI text at top is masked */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '35%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── CSS Text overlay — perfect Cyrillic via browser font ── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '0.6rem 0.65rem 0.65rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.22rem',
        pointerEvents: 'none',
      }}>
        {/* Headline */}
        <p style={{
          margin: 0,
          fontSize: 'clamp(0.75rem, 7cqw, 1.05rem)',
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.15,
          textShadow: '0 2px 8px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,1)',
          wordBreak: 'break-word',
          fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {overlay.headline}
        </p>

        {/* Body */}
        {overlay.body && (
          <p style={{
            margin: 0,
            fontSize: 'clamp(0.6rem, 4.5cqw, 0.75rem)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.3,
            textShadow: '0 1px 4px rgba(0,0,0,1)',
            wordBreak: 'break-word',
            fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {overlay.body}
          </p>
        )}

        {/* CTA */}
        {overlay.cta && (
          <span style={{
            display: 'inline-block',
            marginTop: '0.18rem',
            alignSelf: 'flex-start',
            background: '#f59e0b',
            color: '#1c1917',
            fontSize: 'clamp(0.55rem, 4cqw, 0.68rem)',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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
        backdropFilter: 'blur(4px)',
      }}>
        #{index}
      </div>

      {/* ── Hover actions (inside overflow:hidden card → never overflow) ── */}
      {hovered && !isExporting && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(5,0,40,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          backdropFilter: 'blur(3px)',
          padding: '0.5rem',
        }}>
          {/* Download composite PNG */}
          <button
            onClick={handleDownload}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: '#6366f1', color: 'white',
              border: 'none', borderRadius: '6px',
              padding: '0.4rem 0.8rem', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer', width: '100%', justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <Download size={13} /> Скачать PNG
          </button>

          {/* Replace button */}
          {onReplace && (
            <button
              onClick={onReplace}
              disabled={disabled || isReplacing}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'rgba(255,255,255,0.12)', color: 'white',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px',
                padding: '0.35rem 0.8rem', fontSize: '0.7rem', fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                width: '100%', justifyContent: 'center',
                boxSizing: 'border-box',
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

      {/* Export spinner overlay */}
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
  );
}
