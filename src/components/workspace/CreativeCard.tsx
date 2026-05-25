'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2, Eye, Trash2 } from 'lucide-react';

export interface CreativeOverlay {
  headline: string;
  body?: string;
  cta?: string;
  accentColor: string;
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

// ── Accent color from design brief ──────────────────────────────────────────
function extractAccentColor(brief: string): string {
  if (/жовт|золот|gold|yellow/i.test(brief))        return '#f59e0b';
  if (/помаранч|оранж|orange/i.test(brief))          return '#f97316';
  if (/зелен|green|emerald/i.test(brief))             return '#22c55e';
  if (/синій|блакит|голуб|blue|teal/i.test(brief))   return '#38bdf8';
  if (/фіолет|бузков|purple|violet/i.test(brief))    return '#a855f7';
  if (/червон|корал|red|coral/i.test(brief))          return '#ef4444';
  if (/рожев|pink/i.test(brief))                     return '#f472b6';
  if (/бірюз|cyan|м.ят/i.test(brief))                return '#14b8a6';
  return '#f59e0b'; // default amber
}

// ── Extract overlay fields from row cells ───────────────────────────────────
export function extractOverlay(cells: string[]): CreativeOverlay {
  const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;

  const conceptTitle = (cells[startIdx] || '')
    .replace(/<br\s*\/?>/gi, ' ').replace(/\*\*/g, '')
    .replace(/^["«„]|["»"]$/g, '').trim();

  const adCopy = (cells[startIdx + 1] || '')
    .replace(/<br\s*\/?>/gi, ' ').replace(/\*\*/g, '').trim();

  const brief = (cells[startIdx + 2] || cells[cells.length - 1] || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/\*\*/g, '');

  const accentColor = extractAccentColor(brief);

  // Headline: quoted → full line → adCopy first sentence → conceptTitle
  const stripSuffix = (s: string) =>
    s.replace(/\s*[–—]\s*[a-zа-яіїєґ]/i, '').replace(/^["«„]|["»"]$/g, '').trim();

  const hlQ = brief.match(/(?:заголовок|хук|headline|hook)[^:]*:\s*[«"„""]([^»""]{3,120})[»""]/i);
  const hlL = brief.match(/(?:заголовок|хук|headline|hook)[^:]*:\s*([^\n]{5,120})/i);
  const adFirst = adCopy.split(/[.!?]+[\s\u00a0]+|<br\s*\/?>|\n/i)[0]
    ?.replace(/<[^>]+>/g, '').trim();

  const headline =
    stripSuffix(hlQ?.[1] || '') ||
    stripSuffix(hlL?.[1] || '') ||
    stripSuffix(adFirst || '') ||
    conceptTitle;

  // CTA
  const ctaM =
    brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*[«"„""]([^»""]{3,50})[»""]/i) ||
    brief.match(/(?:\bcta\b|кнопка)[^:]*:\s*([^\n]{5,50})/i);
  const rawCta = ctaM?.[1]
    ?.replace(/\s*[–—]\s*[a-zа-яіїєґ].*/i, '')
    .replace(/^["«„]|["»"]$/g, '').trim();
  const isLayout = rawCta && /жовт|помаранч|колір|фон|елемент|шрифт|розташ/i.test(rawCta);
  const cta = rawCta && !isLayout ? rawCta : undefined;

  // Body
  const firstSentence = adCopy.split(/[.!?]\s+/)[0]?.replace(/<[^>]+>/g, '').trim();
  const body = firstSentence && firstSentence.length > 8 && firstSentence !== headline
    ? firstSentence : undefined;

  return { headline, body, cta, accentColor };
}

// ── Layout templates (3 variants based on card index) ───────────────────────
interface Layout {
  scrimPos: 'bottom' | 'top';
  scrim: string;
  textPos: 'bottom' | 'top';
  hlColor: string;
  bodyColor: string;
  ctaBg: string;
  ctaColor: string;
}

function getLayout(index: number, accent: string): Layout {
  switch ((index - 1) % 3) {
    case 1: // accent colour band at bottom
      return {
        scrimPos: 'bottom', textPos: 'bottom',
        scrim: `linear-gradient(to top, ${accent}dd 0%, ${accent}88 45%, transparent 85%)`,
        hlColor: '#fff', bodyColor: 'rgba(255,255,255,0.9)',
        ctaBg: '#fff', ctaColor: accent,
      };
    case 2: // dark gradient from top
      return {
        scrimPos: 'top', textPos: 'top',
        scrim: 'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 45%, transparent 100%)',
        hlColor: accent, bodyColor: 'rgba(255,255,255,0.88)',
        ctaBg: accent, ctaColor: '#111',
      };
    default: // classic dark bottom gradient
      return {
        scrimPos: 'bottom', textPos: 'bottom',
        scrim: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.6) 55%, transparent 100%)',
        hlColor: '#fff', bodyColor: 'rgba(255,255,255,0.85)',
        ctaBg: accent, ctaColor: '#111',
      };
  }
}

// ── HTML preview page (full-size, perfect Cyrillic via Google Fonts) ─────────
function buildPreviewHtml(imageUrl: string, overlay: CreativeOverlay, index: number): string {
  const lay = getLayout(index, overlay.accentColor);
  const isTop = lay.textPos === 'top';
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Creative #${index}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{position:relative;width:min(90vmin,680px);aspect-ratio:1/1;border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.8)}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.dim{position:absolute;inset:0;background:rgba(0,0,0,0.22);pointer-events:none}
.scrim{position:absolute;${isTop ? 'top' : 'bottom'}:0;left:0;right:0;height:68%;background:${lay.scrim};pointer-events:none}
.txt{position:absolute;${isTop ? 'top:0' : 'bottom:0'};left:0;right:0;padding:2rem;font-family:'Inter',sans-serif}
h1{color:${lay.hlColor};font-size:clamp(1.4rem,4vw,2rem);font-weight:800;line-height:1.15;text-shadow:0 2px 16px rgba(0,0,0,1);margin-bottom:0.5rem}
p{color:${lay.bodyColor};font-size:clamp(0.95rem,2.5vw,1.1rem);font-weight:400;text-shadow:0 1px 8px rgba(0,0,0,1);margin-bottom:0.6rem;line-height:1.4}
.cta{display:inline-block;background:${lay.ctaBg};color:${lay.ctaColor};padding:0.45rem 1.3rem;border-radius:10px;font-weight:800;font-size:clamp(0.85rem,2vw,1rem);margin-top:0.3rem}
</style>
</head><body>
<div class="card">
  <img src="${imageUrl}" crossorigin="anonymous"/>
  <div class="dim"></div>
  <div class="scrim"></div>
  <div class="txt">
    <h1>${overlay.headline}</h1>
    ${overlay.body ? `<p>${overlay.body}</p>` : ''}
    ${overlay.cta ? `<span class="cta">${overlay.cta}</span>` : ''}
  </div>
</div>
</body></html>`;
}

// ── Main component ───────────────────────────────────────────────────────────
export function CreativeCard({
  index, imageUrl, overlay,
  isReplacing, disabled, onReplace, onDelete,
}: CreativeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hovered, setHovered] = useState(false);

  const layout = getLayout(index, overlay.accentColor);

  // Open full-size preview in new tab (synchronous — no popup block)
  const handleOpenFull = useCallback(() => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Браузер заблокировал окно. Разрешите всплывающие для этого сайта.');
      return;
    }
    newWindow.document.write(buildPreviewHtml(imageUrl, overlay, index));
    newWindow.document.close();
  }, [imageUrl, overlay, index]);

  // Download composite PNG
  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    setHovered(false);
    await new Promise(r => setTimeout(r, 80));
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, allowTaint: false, scale: 2, backgroundColor: null,
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

  const isTop = layout.textPos === 'top';

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: '10px', overflow: 'hidden',
        border: '1px solid #c7d2fe', aspectRatio: '1/1',
        background: '#1e1b4b', boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
        userSelect: 'none', containerType: 'inline-size',
      }}
    >
      {/* Background image */}
      <img
        src={imageUrl} alt={`Креатив #${index}`} crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Full-card dim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', pointerEvents: 'none' }} />

      {/* Gradient scrim */}
      <div style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        left: 0, right: 0, height: '72%',
        background: layout.scrim,
        pointerEvents: 'none',
      }} />

      {/* CSS text overlay */}
      <div style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        left: 0, right: 0,
        padding: '0.55rem 0.6rem 0.6rem',
        display: 'flex', flexDirection: 'column', gap: '0.2rem',
        pointerEvents: 'none',
      }}>
        <p style={{
          margin: 0,
          fontSize: 'clamp(0.72rem, 7cqw, 1rem)', fontWeight: 800,
          color: layout.hlColor, lineHeight: 1.15,
          textShadow: '0 2px 8px rgba(0,0,0,1)', wordBreak: 'break-word',
          fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {overlay.headline}
        </p>
        {overlay.body && (
          <p style={{
            margin: 0,
            fontSize: 'clamp(0.58rem, 4cqw, 0.72rem)', fontWeight: 400,
            color: layout.bodyColor, lineHeight: 1.3,
            textShadow: '0 1px 4px rgba(0,0,0,1)', wordBreak: 'break-word',
            fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {overlay.body}
          </p>
        )}
        {overlay.cta && (
          <span style={{
            display: 'inline-block', marginTop: '0.15rem', alignSelf: 'flex-start',
            background: layout.ctaBg, color: layout.ctaColor,
            fontSize: 'clamp(0.52rem, 3.5cqw, 0.65rem)', fontWeight: 800,
            padding: '0.12rem 0.45rem', borderRadius: '4px',
            fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
            maxWidth: '92%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {overlay.cta}
          </span>
        )}
      </div>

      {/* Index badge */}
      <div style={{
        position: 'absolute', top: '0.3rem', left: '0.3rem',
        background: 'rgba(67,56,202,0.9)', color: 'white',
        fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.32rem', borderRadius: '4px',
      }}>
        #{index}
      </div>

      {/* Hover actions */}
      {hovered && !isExporting && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(5,0,40,0.65)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'stretch', justifyContent: 'center',
          gap: '0.35rem', padding: '0.6rem',
          backdropFilter: 'blur(4px)',
        }}>
          <button
            onClick={handleOpenFull}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
              background: 'white', color: '#4338ca', border: 'none',
              borderRadius: '7px', padding: '0.42rem 0', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer', width: '100%',
            }}
          >
            <Eye size={13} /> В новой вкладке
          </button>

          <button
            onClick={handleDownload}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
              background: '#6366f1', color: 'white', border: 'none',
              borderRadius: '7px', padding: '0.42rem 0', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer', width: '100%',
            }}
          >
            <Download size={13} /> Скачать PNG
          </button>

          {onReplace && (
            <button
              onClick={onReplace} disabled={disabled || isReplacing}
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
                : <><RefreshCw size={12} /> Перегенерировать</>}
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete} disabled={disabled || isReplacing}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                background: 'rgba(220,38,38,0.15)', color: '#fca5a5',
                border: '1px solid rgba(220,38,38,0.3)', borderRadius: '7px',
                padding: '0.38rem 0', fontSize: '0.68rem', fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', marginTop: '0.1rem',
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
          position: 'absolute', inset: 0, background: 'rgba(5,0,40,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.75rem', fontWeight: 700, gap: '0.4rem',
        }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Экспортирую…
        </div>
      )}
    </div>
  );
}
