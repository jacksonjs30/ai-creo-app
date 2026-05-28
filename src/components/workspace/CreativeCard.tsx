'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, Eye, Trash2, LayoutTemplate } from 'lucide-react';
import { CreativeDocument, BlockSpec } from '@/types/creative-layout';

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
  data: any; // Can be string (legacy image URL) or layout object
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

  useEffect(() => {
    if (containerRef.current) {
      setScale(containerRef.current.clientWidth / 1080);
    }
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setScale(entry.contentRect.width / 1080);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleOpenFull = () => {
    if (isLayout && onEdit) { onEdit(); return; }
    window.open(displayUrl, '_blank');
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await fetch(displayUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `creative_${index}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open(displayUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
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
        <img src={displayUrl} alt={`Креатив #${index}`} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Render Layout Blocks */}
      {doc && doc.blocks && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 1080, height: 1080,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          pointerEvents: 'none'
        }}>
          {doc.blocks.map(block => {
            if (block.type === 'image') return null;
            const b = block as any;
            
            let color = b.colorRole || '#ffffff';
            if (color === 'textPrimary') color = doc.brandPalette?.textPrimary || '#1e293b';
            else if (color === 'accentPrimary') color = doc.brandPalette?.accentPrimary || '#f59e0b';
            else if (!color.startsWith('#')) color = '#ffffff';

            let bgColor = b.bgColorRole || 'transparent';
            if (bgColor === 'accentPrimary') bgColor = doc.brandPalette?.accentPrimary || '#f59e0b';
            else if (bgColor === 'primary') bgColor = doc.brandPalette?.accentPrimary || '#6366f1';

            const fs = b.fontSize || (b.fontRole === 'display' ? 78 : b.fontRole === 'highlight' ? 54 : b.fontRole === 'badge' ? 38 : 32);
            const ff = b.fontFamily || 'Montserrat';
            let bw = parseInt(b.w || b.width || '0');
            if (!bw || isNaN(bw)) bw = b.type === 'button' ? 600 : b.fontRole === 'display' ? 950 : 850;
            let bh = parseInt(b.h || b.height || '0');
            if (!bh || isNaN(bh)) bh = b.type === 'button' ? 120 : b.fontRole === 'display' ? 250 : 160;
            const bx = b.x !== undefined ? b.x - bw / 2 : 1080 / 2 - bw / 2;
            const by = b.y !== undefined ? b.y - bh / 2 : 1080 / 2 - bh / 2;

            return (
              <div key={b.id} style={{
                position: 'absolute', left: bx, top: by, width: bw, height: bh,
                display: 'flex', alignItems: 'center',
                justifyContent: b.align === 'center' ? 'center' : b.align === 'left' ? 'flex-start' : 'flex-end',
                background: (b.type === 'button' || b.type === 'shape') ? bgColor : 'transparent',
                borderRadius: b.type === 'button' ? '24px' : b.shape === 'pill' ? '99px' : '4px',
                boxShadow: b.type === 'button' ? '0 16px 40px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.2)' : 'none',
                padding: b.type === 'button' ? '20px 48px' : '0',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  width: '100%',
                  fontSize: `${fs}px`, fontFamily: `'${ff}', sans-serif`,
                  fontWeight: b.fontRole === 'display' || b.type === 'button' ? 900 : 700,
                  color: b.type === 'button' ? (b.textColorRole || '#000') : color,
                  textAlign: b.align || 'center', lineHeight: 1.15,
                  textTransform: b.type === 'button' ? 'uppercase' : 'none',
                  letterSpacing: b.type === 'button' ? '1px' : 'normal',
                  textShadow: b.type === 'button' ? 'none' : '0 4px 24px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.8)',
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
