'use client';

import { useState } from 'react';
import { Download, RefreshCw, Loader2, Eye, Trash2, Edit2 } from 'lucide-react';

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
  onEdit?: () => void;
}

// Kept for backward compatibility with ScriptStudio.tsx imports and signatures
export function extractOverlay(cells: string[]): CreativeOverlay {
  return {
    headline: '',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    bgColor: '#0a0a0c',
  };
}

export function CreativeCard({
  index, imageUrl,
  isReplacing, disabled, onReplace, onDelete, onEdit
}: CreativeCardProps) {
  const [hovered, setHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Open full-size image in new tab with a solid dark background wrapper
  const handleOpenFull = () => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      window.open(imageUrl, '_blank');
      return;
    }
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Креатив #${index}</title>
        <style>
          body {
            margin: 0;
            background-color: #0c0a1c;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
            font-family: system-ui, -apple-system, sans-serif;
          }
          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          }
        </style>
      </head>
      <body>
        <img src="${imageUrl}" />
      </body>
      </html>
    `);
    newWindow.document.close();
  };

  // Download raw image directly via fetch
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setHovered(false);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `creative_${index}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Failed to download image directly', e);
      window.open(imageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(199,210,254,0.3)', aspectRatio: '1/1',
        background: '#0c0a1c', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        userSelect: 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Generated image or video */}
      {imageUrl.endsWith('.mp4') ? (
        <video
          src={imageUrl} crossOrigin="anonymous"
          autoPlay loop muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <img
          src={imageUrl} alt={`Креатив #${index}`} crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Index badge */}
      <div style={{
        position: 'absolute', top: '0.4rem', left: '0.4rem',
        background: 'rgba(67,56,202,0.9)', color: 'white',
        fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.38rem', borderRadius: '5px',
      }}>
        #{index}
      </div>

      {/* Hover actions */}
      {hovered && !isDownloading && (
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
              borderRadius: '7px', padding: '0.42rem 0', fontSize: '0.68rem', fontWeight: 700,
              cursor: 'pointer', width: '100%', textAlign: 'center', whiteSpace: 'normal', lineHeight: '1.1'
            }}
          >
            <Eye size={13} style={{ flexShrink: 0 }} /> В новой вкладке
          </button>

          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                background: '#f59e0b', color: 'white', border: 'none',
                borderRadius: '7px', padding: '0.42rem 0', fontSize: '0.68rem', fontWeight: 700,
                cursor: 'pointer', width: '100%', textAlign: 'center', whiteSpace: 'normal', lineHeight: '1.1'
              }}
            >
              <Edit2 size={13} style={{ flexShrink: 0 }} /> Редактировать
            </button>
          )}

          <button
            onClick={handleDownload}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
              background: '#6366f1', color: 'white', border: 'none',
              borderRadius: '7px', padding: '0.42rem 0', fontSize: '0.68rem', fontWeight: 700,
              cursor: 'pointer', width: '100%', textAlign: 'center', whiteSpace: 'normal', lineHeight: '1.1'
            }}
          >
            <Download size={13} style={{ flexShrink: 0 }} /> Скачать {imageUrl.endsWith('.mp4') ? 'MP4' : 'PNG'}
          </button>

          {onReplace && (
            <button
              onClick={onReplace} disabled={disabled || isReplacing}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: '7px',
                padding: '0.38rem 0', fontSize: '0.65rem', fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', textAlign: 'center', whiteSpace: 'normal', lineHeight: '1.1'
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

      {/* Download spinner */}
      {isDownloading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(5,0,40,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.75rem', fontWeight: 700, gap: '0.4rem',
        }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Скачиваю…
        </div>
      )}
    </div>
  );
}
