'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { X, Download, Save, LayoutTemplate } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { CreativeDocument, BlockSpec } from '@/types/creative-layout';

interface CreativeEditorProps {
  layout: any;
  onClose: () => void;
  onSave: (newLayout: any) => void;
}

const FONTS = ['Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Oswald', 'Playfair Display'];
const CANVAS_SIZE = 1080;

function getImageUrl(layout: any): string | null {
  if (!layout) return null;
  // { background: { imageUrl } } — from API
  if (layout.background?.imageUrl) return layout.background.imageUrl;
  // { backgroundUrl } — from editor save
  if (typeof layout.backgroundUrl === 'string') return layout.backgroundUrl;
  // legacy string
  if (typeof layout === 'string') return layout;
  return null;
}

function getDocument(layout: any): CreativeDocument | null {
  if (!layout) return null;
  if (layout.document) return layout.document;
  return null;
}

export function CreativeEditor({ layout, onClose, onSave }: CreativeEditorProps) {
  const bgUrl = getImageUrl(layout);
  const initialDoc = getDocument(layout);

  const [doc, setDoc] = useState<CreativeDocument | null>(initialDoc);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(0.55);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute scale to fit canvas in window height
  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight - 60 - 48; // header + padding
      const w = window.innerWidth - 320 - 48; // sidebar + padding
      let s = Math.min(h / CANVAS_SIZE, w / CANVAS_SIZE, 0.72);
      if (isNaN(s)) s = 0.55;
      setScale(Math.max(s, 0.3));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Init block positions
  useEffect(() => {
    if (!doc) return;
    let changed = false;
    const updated = doc.blocks.map((b) => {
      const bx = b as any;
      if (bx.x === undefined || bx.y === undefined) {
        changed = true;
        const area = b.area || '';
        let x = CANVAS_SIZE / 2;
        let y = CANVAS_SIZE / 2;
        if (area.includes('top')) y = 140;
        else if (area.includes('bottom')) y = CANVAS_SIZE - 140;
        else if (area.includes('under_headline')) y = 320;
        else if (area.includes('above_cta')) y = 820;
        if (area.includes('left')) x = 200;
        else if (area.includes('right')) x = CANVAS_SIZE - 200;
        return { ...b, x, y, w: bx.w || 900, h: bx.h || 160 };
      }
      return b;
    });
    if (changed) setDoc((prev) => prev ? { ...prev, blocks: updated as BlockSpec[] } : prev);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateBlock = useCallback((id: string, patch: Record<string, any>) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, blocks: prev.blocks.map((b) => b.id === id ? { ...b, ...patch } as BlockSpec : b) };
    });
  }, []);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedId(null);
    await new Promise((r) => setTimeout(r, 120));
    try {
      const url = await htmlToImage.toPng(canvasRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.download = `creative_${Date.now()}.png`;
      a.href = url;
      a.click();
    } catch (e) {
      alert('Ошибка при экспорте');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedBlock = doc?.blocks.find((b) => b.id === selectedId) as any;

  const getFontSize = (b: any) => b.fontSize || (b.fontRole === 'display' ? 78 : b.fontRole === 'highlight' ? 54 : b.fontRole === 'badge' ? 38 : 32);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1117', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Header ── */}
      <div style={{ height: 60, background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e6edf3' }}>
          <LayoutTemplate size={20} color="#818cf8" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Редактор креатива</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={btnStyle('#30363d', '#e6edf3')}>
            <X size={15} /> Отмена
          </button>
          <button onClick={() => onSave({ ...layout, document: doc })} style={btnStyle('#21262d', '#c9d1d9')}>
            <Save size={15} /> Сохранить
          </button>
          <button onClick={handleExport} disabled={isExporting} style={btnStyle('#6366f1', '#fff', true)}>
            <Download size={15} /> {isExporting ? 'Экспорт...' : 'Скачать PNG'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas area */}
        <div
          ref={containerRef}
          onClick={(e) => { if (e.target === containerRef.current) setSelectedId(null); }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', overflow: 'hidden', padding: '24px' }}
        >
          {/* Outer wrapper — actual pixel size that the div takes on screen */}
          <div style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale, position: 'relative', flexShrink: 0 }}>
            {/* Inner 1080×1080 canvas, scaled down */}
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_SIZE, height: CANVAS_SIZE,
                position: 'absolute', top: 0, left: 0,
                transform: `scale(${scale})`, transformOrigin: 'top left',
                overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
                background: '#fff',
              }}
              onClick={(e) => { if (e.target === canvasRef.current) setSelectedId(null); }}
            >
              {/* Background image */}
              {bgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bgUrl} alt="bg" crossOrigin="anonymous"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#e0e7ff,#fce7f3)', pointerEvents: 'none' }} />
              )}

              {/* Text/shape blocks */}
              {(doc?.blocks || []).map((block) => {
                const b = block as any;
                const isSelected = block.id === selectedId && !isExporting;

                let color = b.colorRole || '#ffffff';
                if (color === 'textPrimary') color = doc?.brandPalette?.textPrimary || '#1e293b';
                else if (color === 'accentPrimary') color = doc?.brandPalette?.accentPrimary || '#f59e0b';
                else if (!color.startsWith('#')) color = '#ffffff';

                let bgColor = b.bgColorRole || 'transparent';
                if (bgColor === 'accentPrimary') bgColor = doc?.brandPalette?.accentPrimary || '#f59e0b';
                else if (bgColor === 'primary') bgColor = doc?.brandPalette?.accentPrimary || '#6366f1';

                const fs = getFontSize(b);
                const ff = b.fontFamily || 'Montserrat';
                const align = b.align || 'center';
                
                let bw = parseInt(b.w || b.width || '0');
                if (!bw || isNaN(bw)) bw = b.type === 'button' ? 600 : b.fontRole === 'display' ? 950 : 850;
                let bh = parseInt(b.h || b.height || '0');
                if (!bh || isNaN(bh)) bh = b.type === 'button' ? 120 : b.fontRole === 'display' ? 250 : 160;
                
                const bx = b.x !== undefined ? b.x - bw / 2 : 1080 / 2 - bw / 2;
                const by = b.y !== undefined ? b.y - bh / 2 : 1080 / 2 - bh / 2;

                if (block.type === 'image') return null;

                return (
                  <Rnd
                    key={block.id}
                    scale={scale}
                    position={{ x: bx, y: by }}
                    size={{ width: bw, height: bh }}
                    onDragStop={(_e, d) => updateBlock(block.id, { x: d.x + bw / 2, y: d.y + bh / 2 })}
                    onResizeStop={(_e, _dir, ref, _delta, pos) => updateBlock(block.id, { w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x + parseInt(ref.style.width) / 2, y: pos.y + parseInt(ref.style.height) / 2 })}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(block.id); }}
                    style={{
                      border: isSelected ? '2px solid #818cf8' : '2px solid transparent',
                      borderRadius: block.type === 'button' ? '24px' : b.shape === 'pill' ? '99px' : '4px',
                      background: (block.type === 'button' || block.type === 'shape') ? bgColor : 'transparent',
                      boxShadow: block.type === 'button' ? '0 16px 40px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.2)' : 'none',
                      display: 'flex', alignItems: 'center',
                      justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
                      padding: block.type === 'button' ? '20px 48px' : '0',
                      cursor: 'move',
                      boxSizing: 'border-box',
                    }}
                    enableResizing={isSelected}
                  >
                    <div
                      contentEditable={!isExporting}
                      suppressContentEditableWarning
                      onBlur={(e) => updateBlock(block.id, { text: e.currentTarget.innerText })}
                      style={{
                        width: '100%', outline: 'none', cursor: 'text',
                        fontSize: `${fs}px`, fontFamily: `'${ff}', sans-serif`,
                        fontWeight: b.fontRole === 'display' || block.type === 'button' ? 900 : 700,
                        color: block.type === 'button' ? (b.textColorRole || '#000') : color,
                        textAlign: align as any,
                        lineHeight: 1.15,
                        textTransform: block.type === 'button' ? 'uppercase' : 'none',
                        letterSpacing: block.type === 'button' ? '1px' : 'normal',
                        textShadow: block.type === 'button' ? 'none' : '0 4px 24px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.8)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {b.text}
                    </div>
                  </Rnd>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ width: 300, background: '#161b22', borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #21262d' }}>
            <p style={{ color: '#8b949e', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
              {selectedId
                ? 'Редактируйте выбранный блок ниже'
                : '← Кликните на блок на холсте для редактирования'}
            </p>
          </div>

          {selectedBlock ? (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <Field label="Текст">
                <textarea
                  value={selectedBlock.text || ''}
                  onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                  style={inputStyle}
                  rows={3}
                />
              </Field>
              <Field label="Шрифт">
                <select value={selectedBlock.fontFamily || 'Inter'} onChange={(e) => updateBlock(selectedBlock.id, { fontFamily: e.target.value })} style={inputStyle}>
                  {FONTS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Field label="Размер (px)" style={{ flex: 1 }}>
                  <input type="number" value={getFontSize(selectedBlock)} onChange={(e) => updateBlock(selectedBlock.id, { fontSize: +e.target.value })} style={inputStyle} />
                </Field>
                <Field label="Выравнивание" style={{ flex: 1 }}>
                  <select value={selectedBlock.align || 'center'} onChange={(e) => updateBlock(selectedBlock.id, { align: e.target.value })} style={inputStyle}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
              </div>
              <Field label="Цвет текста">
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="color" value={selectedBlock.colorRole?.startsWith('#') ? selectedBlock.colorRole : '#ffffff'} onChange={(e) => updateBlock(selectedBlock.id, { colorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }} />
                  <input type="text" value={selectedBlock.colorRole?.startsWith('#') ? selectedBlock.colorRole : '#ffffff'} onChange={(e) => updateBlock(selectedBlock.id, { colorRole: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </Field>
              {(selectedBlock.type === 'button' || selectedBlock.type === 'shape') && (
                <Field label="Цвет фона кнопки">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={selectedBlock.bgColorRole?.startsWith('#') ? selectedBlock.bgColorRole : '#f59e0b'} onChange={(e) => updateBlock(selectedBlock.id, { bgColorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }} />
                    <input type="text" value={selectedBlock.bgColorRole?.startsWith('#') ? selectedBlock.bgColorRole : '#f59e0b'} onChange={(e) => updateBlock(selectedBlock.id, { bgColorRole: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </Field>
              )}
            </div>
          ) : (
            <div style={{ padding: '2rem 1.25rem', color: '#484f58', fontSize: '0.85rem', textAlign: 'center' }}>
              Выберите блок на холсте чтобы изменить его стиль, шрифт или цвет.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── helpers ──
function btnStyle(bg: string, color: string, primary = false): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    background: bg, color, border: 'none', borderRadius: '8px',
    padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
    boxShadow: primary ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px',
  color: '#e6edf3', padding: '0.45rem 0.6rem', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
};

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b949e', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}
