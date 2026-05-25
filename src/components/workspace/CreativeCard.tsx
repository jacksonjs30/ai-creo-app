'use client';

import { useRef, useState, useCallback } from 'react';
import { Download, RefreshCw, Loader2, Eye, Trash2 } from 'lucide-react';

export interface CreativeOverlay {
  headline: string;
  body?: string;
  cta?: string;
  accentColor: string;
  textColor: string;
  bgColor: string;
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

// Helper to determine text contrast on light/dark colors
function getContrastColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#0f172a' : '#ffffff';
}

// ── Smart color extraction from design brief ──────────────────────────────────
function extractColorsFromBrief(brief: string) {
  const colors = {
    accent: '#f59e0b', // default amber
    text: '#ffffff',
    bg: '#0a0a0c', // deep rich black
  };

  const textLower = brief.toLowerCase();

  // 1. Accent color selection
  if (/золот|gold|жовт|желт/i.test(textLower)) {
    colors.accent = '#fbbf24'; // Golden amber
  } else if (/помаранч|оранж|orange/i.test(textLower)) {
    colors.accent = '#f97316'; // Vivid orange
  } else if (/червон|красн|red|корал/i.test(textLower)) {
    colors.accent = '#ef4444'; // Red
  } else if (/розов|рожев|pink/i.test(textLower)) {
    colors.accent = '#f472b6'; // Vibrant pink
  } else if (/фіолет|бузков|purple|violet|сливов/i.test(textLower)) {
    colors.accent = '#a855f7'; // Purple
  } else if (/синій|сине|блакит|голуб|blue/i.test(textLower)) {
    colors.accent = '#38bdf8'; // Sky blue
  } else if (/зелен|green|emerald/i.test(textLower)) {
    colors.accent = '#10b981'; // Emerald
  } else if (/бірюз|cyan|м.ят/i.test(textLower)) {
    colors.accent = '#14b8a6'; // Mint teal
  }

  // 2. Text color selection (soft text overlays)
  if (/світло-рожеви|персиков|розов|pink/i.test(textLower)) {
    colors.text = '#fbcfe8'; // Pink-200
  } else if (/жовт|yellow/i.test(textLower) && !/акцент/i.test(textLower)) {
    colors.text = '#fef08a'; // Yellow-100
  } else if (/блакит|голуб/i.test(textLower) && !/акцент/i.test(textLower)) {
    colors.text = '#e0f2fe'; // Sky-100
  }

  // 3. Scrim background base theme
  if (/глибокий фіолетовий|фіолетов|purple/i.test(textLower)) {
    colors.bg = '#0f051d'; // Indigo-950 base
  } else if (/синій фон|сине|blue/i.test(textLower)) {
    colors.bg = '#020617'; // Slate-950 base
  } else if (/зелен|green/i.test(textLower)) {
    colors.bg = '#022c22'; // Emerald-950 base
  } else if (/червон|red/i.test(textLower)) {
    colors.bg = '#450a0a'; // Red-950 base
  }

  return colors;
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

  const colors = extractColorsFromBrief(brief);

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

  return { headline, body, cta, accentColor: colors.accent, textColor: colors.text, bgColor: colors.bg };
}

// ── Layout templates (3 variants based on card index) ───────────────────────
interface Layout {
  scrimPos: 'bottom' | 'top';
  scrim: string;
  textPos: 'bottom' | 'top';
  hlColor: string;
  hlStyle: React.CSSProperties;
  hlCss: string;
  bodyColor: string;
  ctaBg: string;
  ctaColor: string;
  ctaStyle: React.CSSProperties;
  ctaCss: string;
}

function getLayout(index: number, overlay: CreativeOverlay): Layout {
  const accent = overlay.accentColor;
  const text = overlay.textColor;
  const bg = overlay.bgColor;
  const accentContrast = getContrastColor(accent);

  switch ((index - 1) % 3) {
    case 1: // Accent Sticker layout: text at bottom, headline has a colored solid badge background
      return {
        scrimPos: 'bottom',
        textPos: 'bottom',
        scrim: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 45%, transparent 95%)',
        hlColor: accentContrast,
        hlStyle: {
          background: accent,
          color: accentContrast,
          padding: '0.15rem 0.45rem',
          borderRadius: '6px',
          display: 'inline-block',
          width: 'fit-content',
          boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
        },
        hlCss: `background: ${accent}; color: ${accentContrast}; padding: 0.25rem 0.6rem; border-radius: 8px; display: inline-block; width: fit-content; box-shadow: 0 4px 12px rgba(0,0,0,0.4);`,
        bodyColor: '#ffffff',
        ctaBg: '#ffffff',
        ctaColor: '#000000',
        ctaStyle: {
          color: '#111827',
          background: '#ffffff',
          fontWeight: 800,
        },
        ctaCss: `background: #ffffff; color: #111827; font-weight: 800; border: 1px solid rgba(0,0,0,0.1);`,
      };

    case 2: // Top Scrim Minimalist: text at top, headline is colored accent
      return {
        scrimPos: 'top',
        textPos: 'top',
        scrim: `linear-gradient(to bottom, ${bg}f0 0%, ${bg}90 55%, transparent 100%)`,
        hlColor: accent,
        hlStyle: {
          color: accent,
        },
        hlCss: `color: ${accent};`,
        bodyColor: text,
        ctaBg: accent,
        ctaColor: accentContrast,
        ctaStyle: {
          background: accent,
          color: accentContrast,
        },
        ctaCss: `background: ${accent}; color: ${accentContrast};`,
      };

    default: // Classic Bottom Gradient
      return {
        scrimPos: 'bottom',
        textPos: 'bottom',
        scrim: `linear-gradient(to top, ${bg}f5 0%, ${bg}b0 50%, transparent 100%)`,
        hlColor: '#ffffff',
        hlStyle: {
          color: '#ffffff',
        },
        hlCss: `color: #ffffff;`,
        bodyColor: text,
        ctaBg: accent,
        ctaColor: accentContrast,
        ctaStyle: {
          background: accent,
          color: accentContrast,
        },
        ctaCss: `background: ${accent}; color: ${accentContrast};`,
      };
  }
}

// ── HTML preview page (full-size, screen-centered, perfect typography via Inter) ─────────
function buildPreviewHtml(imageUrl: string, overlay: CreativeOverlay, index: number): string {
  const lay = getLayout(index, overlay);
  const isTop = lay.textPos === 'top';
  
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Creative Preview #${index}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#09090b;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;overflow:auto}
.card{
  position:relative;
  width:min(95vw, 95vh, 1024px);
  aspect-ratio:1/1;
  border-radius:24px;
  overflow:hidden;
  box-shadow:0 30px 100px rgba(0,0,0,0.85);
  container-type:inline-size;
  border:1px solid rgba(255,255,255,0.06);
}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.dim{position:absolute;inset:0;background:rgba(0,0,0,0.22);pointer-events:none}
.scrim{position:absolute;${isTop ? 'top' : 'bottom'}:0;left:0;right:0;height:70%;background:${lay.scrim};pointer-events:none}
.txt{
  position:absolute;
  ${isTop ? 'top:0' : 'bottom:0'};
  left:0;right:0;
  padding:8cqw;
  font-family:'Inter', sans-serif;
  display:flex;
  flex-direction:column;
  gap:2.5cqw;
}
h1{
  ${lay.hlCss}
  font-size:clamp(1.6rem, 7.8cqw, 2.6rem);
  font-weight:800;
  line-height:1.12;
  text-shadow:0 3px 18px rgba(0,0,0,0.9);
  word-break:break-word;
}
p{
  color:${lay.bodyColor};
  font-size:clamp(1.0rem, 4.2cqw, 1.35rem);
  font-weight:400;
  text-shadow:0 2px 10px rgba(0,0,0,0.9);
  line-height:1.4;
  word-break:break-word;
}
.cta{
  display:inline-block;
  ${lay.ctaCss}
  padding:0.6rem 1.6rem;
  border-radius:12px;
  font-weight:800;
  font-size:clamp(0.9rem, 3.6cqw, 1.2rem);
  box-shadow:0 6px 20px rgba(0,0,0,0.3);
  align-self:flex-start;
  margin-top:1cqw;
}
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

  const layout = getLayout(index, overlay);

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

  // Download high-resolution composite PNG (1024x1024)
  const handleDownload = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setHovered(false);

    // Create a temporary off-screen container at full 1024x1024 resolution
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '1024px';
    tempContainer.style.height = '1024px';
    tempContainer.style.overflow = 'hidden';

    const isTop = layout.textPos === 'top';
    const accent = overlay.accentColor;

    // Use full styling parameters identical to buildPreviewHtml
    tempContainer.innerHTML = `
      <div style="position:relative; width:1024px; height:1024px; font-family:'Inter', sans-serif; overflow:hidden; background:#0c0a1c;">
        <img src="${imageUrl}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover; display:block;" />
        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.18);"></div>
        <div style="position:absolute; ${isTop ? 'top:0' : 'bottom:0'}; left:0; right:0; height:75%; background:${layout.scrim};"></div>
        <div style="position:absolute; ${isTop ? 'top:0' : 'bottom:0'}; left:0; right:0; padding:80px; display:flex; flex-direction:column; gap:25px; box-sizing:border-box;">
          <p style="margin:0; font-size:64px; font-weight:800; color:${layout.hlColor}; line-height:1.12; text-shadow:0 3px 18px rgba(0,0,0,0.95); word-break:break-word; ${layout.hlCss}">
            ${overlay.headline}
          </p>
          ${overlay.body ? `
            <p style="margin:0; font-size:36px; font-weight:400; color:${layout.bodyColor}; line-height:1.35; text-shadow:0 2px 10px rgba(0,0,0,0.95); word-break:break-word;">
              ${overlay.body}
            </p>
          ` : ''}
          ${overlay.cta ? `
            <span style="display:inline-block; align-self:flex-start; font-size:28px; font-weight:800; padding:16px 42px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.3); margin-top:15px; ${layout.ctaCss}">
              ${overlay.cta}
            </span>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(tempContainer);

    // Wait for image loading
    const tempImg = tempContainer.querySelector('img');
    if (tempImg) {
      await new Promise((resolve) => {
        if (tempImg.complete) resolve(true);
        tempImg.onload = () => resolve(true);
        tempImg.onerror = () => resolve(true);
      });
    }

    await new Promise(r => setTimeout(r, 120));

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        allowTaint: false,
        scale: 1, // Full 1024x1024 resolution already
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `creative_${index}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed, fallback to original background image URL', e);
      window.open(imageUrl, '_blank');
    } finally {
      document.body.removeChild(tempContainer);
      setIsExporting(false);
    }
  }, [imageUrl, index, isExporting, layout, overlay]);

  const isTop = layout.textPos === 'top';

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(199,210,254,0.3)', aspectRatio: '1/1',
        background: '#0c0a1c', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        userSelect: 'none', containerType: 'inline-size',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Background image */}
      <img
        src={imageUrl} alt={`Креатив #${index}`} crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Full-card dim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)', pointerEvents: 'none' }} />

      {/* Gradient scrim */}
      <div style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        left: 0, right: 0, height: '75%',
        background: layout.scrim,
        pointerEvents: 'none',
      }} />

      {/* CSS text overlay */}
      <div style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        left: 0, right: 0,
        padding: '6.5cqw',
        display: 'flex', flexDirection: 'column', gap: '2cqw',
        pointerEvents: 'none',
      }}>
        <p style={{
          margin: 0,
          fontSize: 'clamp(0.75rem, 7.5cqw, 1.15rem)', fontWeight: 800,
          color: layout.hlColor, lineHeight: 1.12,
          textShadow: '0 2px 8px rgba(0,0,0,0.95)', wordBreak: 'break-word',
          fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          ...layout.hlStyle,
        }}>
          {overlay.headline}
        </p>
        {overlay.body && (
          <p style={{
            margin: 0,
            fontSize: 'clamp(0.6rem, 4cqw, 0.78rem)', fontWeight: 400,
            color: layout.bodyColor, lineHeight: 1.35,
            textShadow: '0 1px 5px rgba(0,0,0,0.95)', wordBreak: 'break-word',
            fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {overlay.body}
          </p>
        )}
        {overlay.cta && (
          <span style={{
            display: 'inline-block', alignSelf: 'flex-start',
            fontSize: 'clamp(0.55rem, 3.6cqw, 0.7rem)', fontWeight: 800,
            padding: '0.2rem 0.55rem', borderRadius: '6px',
            fontFamily: '"Inter","Roboto","Helvetica Neue",Arial,sans-serif',
            maxWidth: '92%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            ...layout.ctaStyle,
          }}>
            {overlay.cta}
          </span>
        )}
      </div>

      {/* Index badge */}
      <div style={{
        position: 'absolute', top: '0.4rem', left: '0.4rem',
        background: 'rgba(67,56,202,0.9)', color: 'white',
        fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.38rem', borderRadius: '5px',
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
