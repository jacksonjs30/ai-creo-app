'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, Eye, Trash2, LayoutTemplate } from 'lucide-react';
import { CreativeDocument, BrandPalette } from '@/types/creative-layout';

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
  data: any;
  overlay?: CreativeOverlay;
  isReplacing?: boolean;
  disabled?: boolean;
  onReplace?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function extractOverlay(cells: string[]): CreativeOverlay {
  return { headline: '', accentColor: '#f59e0b', textColor: '#ffffff', bgColor: '#0a0a0c' };
}

/* ─── Shared helpers (same as CreativeEditor) ─── */
const CANVAS = 1080;

function resolveColor(colorRole: string | undefined, palette: BrandPalette | undefined, fallback: string): string {
  if (!colorRole) return fallback;
  if (colorRole.startsWith('#')) return colorRole;
  if (!palette) return fallback;
  const map: Record<string, string | undefined> = {
    'text_primary': palette.textPrimary, 'textPrimary': palette.textPrimary,
    'text_secondary': palette.textSecondary, 'textSecondary': palette.textSecondary,
    'accent_primary': palette.accentPrimary, 'accentPrimary': palette.accentPrimary,
    'accent_secondary': palette.accentSecondary, 'accentSecondary': palette.accentSecondary,
    'text_on_accent': '#FFFFFF',
    'bg_surface': palette.bgGradientFrom, 'bg_accent': palette.accentPrimary,
  };
  return map[colorRole] || fallback;
}

function areaToCoords(area: string): { x: number; y: number } {
  const cx = CANVAS / 2;
  const map: Record<string, { x: number; y: number }> = {
    'top_left': { x: 250, y: 120 }, 'top_center': { x: cx, y: 130 }, 'top_right': { x: 880, y: 100 },
    'under_headline': { x: cx, y: 380 },
    'middle_left': { x: 250, y: cx }, 'middle_center': { x: cx, y: cx }, 'middle_right': { x: 880, y: cx },
    'above_cta': { x: cx, y: 810 },
    'bottom_left': { x: 250, y: 940 }, 'bottom_center': { x: cx, y: 940 }, 'bottom_right': { x: 880, y: 940 },
  };
  return map[area] || { x: cx, y: cx };
}

function getDefaultDims(b: any): { w: number; h: number } {
  if (b.type === 'button') return { w: 620, h: 110 };
  if (b.type === 'shape') return { w: 500, h: 80 };
  if (b.type === 'image') return { w: 120, h: 120 };
  if (b.fontRole === 'display') return { w: 960, h: 200 };
  if (b.fontRole === 'highlight') return { w: 900, h: 130 };
  if (b.fontRole === 'badge') return { w: 500, h: 80 };
  return { w: 860, h: 120 };
}

function safeNum(v: any, fb: number): number { const n = parseFloat(v); return isNaN(n) ? fb : n; }
function getFontSize(b: any): number {
  if (b.fontSize && typeof b.fontSize === 'number') return b.fontSize;
  switch (b.fontRole) { case 'display': return 72; case 'highlight': return 48; case 'badge': return 36; default: return 32; }
}
function getFontWeight(b: any): number {
  if (b.styleHints?.bold) return 900;
  if (b.fontRole === 'display') return 900;
  if (b.type === 'button') return 800;
  if (b.fontRole === 'highlight') return 700;
  if (b.fontRole === 'badge') return 800;
  return 600;
}

export function CreativeCard({
  index, data, isReplacing, disabled, onReplace, onDelete, onEdit
}: CreativeCardProps) {
  const [hovered, setHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  const isLayout = typeof data === 'object' && data !== null && ('document' in data || 'backgroundUrl' in data || 'background' in data);
  const displayUrl = isLayout ? (data.backgroundUrl || data.background?.imageUrl) : data;
  const doc = isLayout ? (data.document as CreativeDocument) : null;
  const palette = doc?.brandPalette;

  useEffect(() => {
    if (containerRef.current) setScale(containerRef.current.clientWidth / CANVAS);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setScale(entry.contentRect.width / CANVAS);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleOpenFull = () => { if (isLayout && onEdit) { onEdit(); return; } window.open(displayUrl, '_blank'); };
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await fetch(displayUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `creative_${index}.png`; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(displayUrl, '_blank'); }
    finally { setIsDownloading(false); }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(199,210,254,0.3)', aspectRatio: '1/1',
        background: '#0c0a1c', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        userSelect: 'none', transition: 'transform 0.2s',
      }}
    >
      {/* Background */}
      {displayUrl?.endsWith('.mp4') ? (
        <video src={displayUrl} crossOrigin="anonymous" autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayUrl} alt={`Креатив #${index}`} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Render Layout Blocks */}
      {doc && doc.blocks && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: CANVAS, height: CANVAS,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          pointerEvents: 'none'
        }}>
          {doc.blocks.map(block => {
            const b = block as any;
            if (block.type === 'image') return null;

            const textColor = b.explicitColor || resolveColor(b.colorRole, palette, '#ffffff');
            const bgColor = resolveColor(b.bgColorRole, palette, 'transparent');
            const btnTextColor = b.explicitColor || resolveColor(b.textColorRole, palette, '#ffffff');
            const hints = b.styleHints || {};

            const defaults = getDefaultDims(b);
            let bw = safeNum(b.w, defaults.w);
            let bh = safeNum(b.h, defaults.h);
            let bx, by;

            if (b.frame) {
              bw = b.frame.width * CANVAS;
              bh = b.frame.height * CANVAS;
              bx = b.frame.x * CANVAS;
              by = b.frame.y * CANVAS;
            } else {
              // Use stored coords or fall back to area-based coords
              const area = b.area || 'middle_center';
              const areaCoords = areaToCoords(area);
              bx = safeNum(b.x, areaCoords.x) - bw / 2;
              by = safeNum(b.y, areaCoords.y) - bh / 2;
            }

            const fs = getFontSize(b);
            const fw = getFontWeight(b);
            const ff = b.fontFamily || 'Montserrat';
            const isButton = block.type === 'button';
            const isShape = block.type === 'shape';

            if (isShape) {
              return (
                <div key={b.id} style={{
                  position: 'absolute', left: bx, top: by, width: bw, height: bh,
                  background: bgColor,
                  borderRadius: b.shape === 'pill' ? '99px' : `${b.cornerRadius || 16}px`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }} />
              );
            }

            return (
              <div key={b.id} style={{
                position: 'absolute', left: bx, top: by, width: bw, height: bh,
                display: 'flex', alignItems: 'center',
                justifyContent: (b.align || 'center') === 'center' ? 'center' : (b.align || 'center') === 'left' ? 'flex-start' : 'flex-end',
                background: isButton ? bgColor : 'transparent',
                borderRadius: isButton ? '24px' : '4px',
                boxShadow: isButton ? '0 12px 36px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.15)' : 'none',
                padding: isButton ? '16px 48px' : '0',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  width: '100%',
                  fontSize: `${fs}px`, fontFamily: `'${ff}', sans-serif`,
                  fontWeight: fw,
                  color: isButton ? btnTextColor : textColor,
                  textAlign: (b.align || 'center') as any,
                  lineHeight: 1.15,
                  textTransform: (isButton || hints.uppercase) ? 'uppercase' : 'none',
                  letterSpacing: (isButton || hints.uppercase) ? '1.5px' : 'normal',
                  textShadow: isButton ? 'none' : '0 4px 20px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.9)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {b.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Index badge */}
      <div style={{
        position: 'absolute', top: '0.4rem', left: '0.4rem',
        background: 'rgba(67,56,202,0.9)', color: 'white',
        fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.38rem', borderRadius: '5px',
      }}>#{index}</div>

      {/* Hover actions */}
      {hovered && !isDownloading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(5,0,40,0.65)',
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center',
          gap: '0.35rem', padding: '0.6rem', backdropFilter: 'blur(4px)', pointerEvents: 'auto'
        }}>
          {isLayout && onEdit ? (
            <button onClick={onEdit} style={actionBtnStyle('#475569', 'white')}><LayoutTemplate size={13} /> Редактировать креатив</button>
          ) : (
            <button onClick={handleOpenFull} style={actionBtnStyle('white', '#4338ca')}><Eye size={13} /> В новой вкладке</button>
          )}
          <button onClick={handleDownload} style={actionBtnStyle('#6366f1', 'white')}><Download size={13} /> Скачать {displayUrl?.endsWith('.mp4') ? 'MP4' : 'PNG'}</button>
          {onReplace && (
            <button onClick={onReplace} disabled={disabled || isReplacing} style={actionBtnStyle('rgba(255,255,255,0.1)', 'white', true)}>
              {isReplacing ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Заменяю…</> : <><RefreshCw size={12} /> Перегенерировать</>}
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} disabled={disabled || isReplacing} style={actionBtnStyle('rgba(220,38,38,0.15)', '#fca5a5', true)}>
              <Trash2 size={12} /> Удалить
            </button>
          )}
        </div>
      )}

      {isDownloading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,0,40,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, gap: '0.4rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Скачиваю…
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(bg: string, color: string, outline = false): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
    background: bg, color, border: outline ? `1px solid ${color.replace(')', ',0.3)')}` : 'none',
    borderRadius: '7px', padding: '0.42rem 0', fontSize: '0.72rem', fontWeight: outline ? 600 : 700,
    cursor: 'pointer', width: '100%',
  };
}
