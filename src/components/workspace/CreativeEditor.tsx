'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { X, Download, Save, LayoutTemplate } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { CreativeDocument, BlockSpec, BrandPalette } from '@/types/creative-layout';

interface CreativeEditorProps {
  layout: any;
  onClose: () => void;
  onSave: (newLayout: any) => void;
}

const FONTS = ['Montserrat', 'Inter', 'Roboto', 'Open Sans', 'Oswald', 'Playfair Display', 'Raleway', 'Bebas Neue'];
const CANVAS_SIZE = 1080;

/* ─── Helpers to extract data from layout object ─── */
function getImageUrl(layout: any): string | null {
  if (!layout) return null;
  if (layout.background?.imageUrl) return layout.background.imageUrl;
  if (typeof layout.backgroundUrl === 'string') return layout.backgroundUrl;
  if (typeof layout === 'string') return layout;
  return null;
}

function getDocument(layout: any): CreativeDocument | null {
  if (!layout) return null;
  if (layout.document) return layout.document;
  return null;
}

/* ─── Area → Pixel coordinate mapping ─── */
function areaToCoords(area: string, blockType: string, fontRole: string): { x: number; y: number } {
  const cx = CANVAS_SIZE / 2; // 540
  const areaMap: Record<string, { x: number; y: number }> = {
    'top_left':       { x: 250, y: 120 },
    'top_center':     { x: cx,  y: 130 },
    'top_right':      { x: 880, y: 100 },
    'under_headline': { x: cx,  y: 380 },
    'middle_left':    { x: 250, y: cx },
    'middle_center':  { x: cx,  y: cx },
    'middle_right':   { x: 880, y: cx },
    'above_cta':      { x: cx,  y: 810 },
    'bottom_left':    { x: 250, y: 940 },
    'bottom_center':  { x: cx,  y: 940 },
    'bottom_right':   { x: 880, y: 940 },
  };
  return areaMap[area] || { x: cx, y: cx };
}

/* ─── Block dimensions by role/type ─── */
function getDefaultDimensions(block: any): { w: number; h: number } {
  const t = block.type;
  const fr = block.fontRole || '';
  if (t === 'button') return { w: 620, h: 110 };
  if (t === 'shape') return { w: 500, h: 80 };
  if (t === 'image') return { w: 120, h: 120 };
  // Text blocks by fontRole
  if (fr === 'display') return { w: 960, h: 200 };
  if (fr === 'highlight') return { w: 900, h: 130 };
  if (fr === 'badge') return { w: 500, h: 80 };
  return { w: 860, h: 120 }; // body default
}

/* ─── Font size by fontRole ─── */
function getFontSize(b: any): number {
  if (b.fontSize && typeof b.fontSize === 'number') return b.fontSize;
  switch (b.fontRole) {
    case 'display': return 72;
    case 'highlight': return 48;
    case 'badge': return 36;
    case 'body': return 32;
    default: return 32;
  }
}

/* ─── Font weight by role ─── */
function getFontWeight(b: any): number {
  if (b.styleHints?.bold) return 900;
  if (b.fontRole === 'display') return 900;
  if (b.type === 'button') return 800;
  if (b.fontRole === 'highlight') return 700;
  if (b.fontRole === 'badge') return 800;
  return 600;
}

/* ─── Resolve colorRole to hex ─── */
function resolveColor(colorRole: string | undefined, palette: BrandPalette | undefined, fallback: string): string {
  if (!colorRole) return fallback;
  // Already hex
  if (colorRole.startsWith('#')) return colorRole;
  if (!palette) return fallback;

  const map: Record<string, string | undefined> = {
    'text_primary': palette.textPrimary,
    'textPrimary': palette.textPrimary,
    'text_secondary': palette.textSecondary,
    'textSecondary': palette.textSecondary,
    'accent_primary': palette.accentPrimary,
    'accentPrimary': palette.accentPrimary,
    'accent_secondary': palette.accentSecondary,
    'accentSecondary': palette.accentSecondary,
    'text_on_accent': '#FFFFFF', // default: white on accent bg
    'bg_surface': palette.bgGradientFrom,
    'bg_accent': palette.accentPrimary,
  };
  return map[colorRole] || fallback;
}

/* ─── Sanitize a number (NaN/undefined → fallback) ─── */
function safeNum(v: any, fallback: number): number {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
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

  // Compute scale based on actual container size
  useEffect(() => {
    const compute = (width: number, height: number) => {
      const h = height - 48; // padding
      const w = width - 48;
      let s = Math.min(h / CANVAS_SIZE, w / CANVAS_SIZE, 1.0);
      if (!s || isNaN(s) || s <= 0) s = 0.55;
      setScale(Math.max(s, 0.25));
    };

    if (containerRef.current) {
      compute(containerRef.current.clientWidth, containerRef.current.clientHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        compute(entry.contentRect.width, entry.contentRect.height);
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Init block positions from area → pixel coords or frame
  useEffect(() => {
    if (!doc?.blocks) return;
    let changed = false;
    const updated = doc.blocks.map((b) => {
      const bx = b as any;
      if (bx.x !== undefined && bx.y !== undefined && bx.w !== undefined && bx.h !== undefined) return b;
      changed = true;

      // If Vision AI provided exact relative frames
      if (b.frame) {
        return {
          ...b,
          w: b.frame.width * CANVAS_SIZE,
          h: b.frame.height * CANVAS_SIZE,
          x: (b.frame.x + b.frame.width / 2) * CANVAS_SIZE,
          y: (b.frame.y + b.frame.height / 2) * CANVAS_SIZE,
        };
      }

      // Fallback to rough area matching
      const area = b.area || 'middle_center';
      const coords = areaToCoords(area, b.type, (b as any).fontRole || '');
      const dims = getDefaultDimensions(b);
      return { ...b, x: coords.x, y: coords.y, w: dims.w, h: dims.h };
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
    await new Promise((r) => setTimeout(r, 150));
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
  const palette = doc?.brandPalette;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1117', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ height: 60, background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e6edf3' }}>
          <LayoutTemplate size={20} color="#818cf8" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Редактор креатива</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={headerBtnStyle('#30363d', '#e6edf3')}>
            <X size={15} /> Отмена
          </button>
          <button onClick={() => onSave({ ...layout, document: doc })} style={headerBtnStyle('#21262d', '#c9d1d9')}>
            <Save size={15} /> Сохранить
          </button>
          <button onClick={handleExport} disabled={isExporting} style={headerBtnStyle('#6366f1', '#fff', true)}>
            <Download size={15} /> {isExporting ? 'Экспорт...' : 'Скачать PNG'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas area */}
        <div
          ref={containerRef}
          onClick={() => setSelectedId(null)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', overflow: 'hidden', padding: '24px' }}
        >
          {/* Outer wrapper — screen-size container */}
          <div style={{ width: CANVAS_SIZE * (isNaN(scale) ? 0.55 : scale), height: CANVAS_SIZE * (isNaN(scale) ? 0.55 : scale), position: 'relative', flexShrink: 0 }}>
            {/* Inner 1080×1080 canvas, scaled down */}
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_SIZE, height: CANVAS_SIZE,
                position: 'absolute', top: 0, left: 0,
                transform: `scale(${isNaN(scale) ? 0.55 : scale})`, transformOrigin: 'top left',
                overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
                background: '#fff',
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
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

              {/* Blocks */}
              {(doc?.blocks || []).map((block) => {
                const b = block as any;
                if (block.type === 'image') return null; // logo placeholders — skip for now

                const isSelected = block.id === selectedId && !isExporting;

                // Resolve colors
                const textColor = b.explicitColor || resolveColor(b.colorRole, palette, '#ffffff');
                const bgColor = resolveColor(b.bgColorRole, palette, 'transparent');
                const btnTextColor = b.explicitColor || resolveColor(b.textColorRole, palette, '#ffffff');

                const fs = getFontSize(b);
                const fw = getFontWeight(b);
                const ff = b.fontFamily || 'Montserrat';
                const align = b.align || 'center';
                const hints = b.styleHints || {};

                // Dimensions — use stored values with safe fallbacks
                const defaults = getDefaultDimensions(b);
                const bw = safeNum(b.w, defaults.w);
                const bh = safeNum(b.h, defaults.h);
                const bx = safeNum(b.x, CANVAS_SIZE / 2) - bw / 2;
                const by = safeNum(b.y, CANVAS_SIZE / 2) - bh / 2;

                // Shape blocks (discount background)
                if (block.type === 'shape') {
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
                        borderRadius: b.shape === 'pill' ? '99px' : `${b.cornerRadius || 16}px`,
                        background: bgColor,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        cursor: 'move',
                      }}
                      enableResizing={isSelected}
                    >
                      <div style={{ width: '100%', height: '100%' }} />
                    </Rnd>
                  );
                }

                // Button & Text blocks
                const isButton = block.type === 'button';
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
                      borderRadius: isButton ? '24px' : b.shape === 'pill' ? '99px' : '4px',
                      background: isButton ? bgColor : 'transparent',
                      boxShadow: isButton ? '0 12px 36px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.15)' : 'none',
                      display: 'flex', alignItems: 'center',
                      justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
                      padding: isButton ? '16px 48px' : '0',
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
                        fontSize: `${fs}px`,
                        fontFamily: `'${ff}', sans-serif`,
                        fontWeight: fw,
                        color: isButton ? btnTextColor : textColor,
                        textAlign: align as any,
                        lineHeight: 1.15,
                        textTransform: (isButton || hints.uppercase) ? 'uppercase' : 'none',
                        letterSpacing: (isButton || hints.uppercase) ? '1.5px' : 'normal',
                        fontStyle: hints.italic ? 'italic' : 'normal',
                        textShadow: isButton
                          ? 'none'
                          : hints.shadow !== false
                            ? '0 4px 20px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.9)'
                            : 'none',
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
              {/* Role badge */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ background: '#30363d', color: '#8b949e', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  {selectedBlock.role || selectedBlock.type}
                </span>
                <span style={{ background: '#1c2128', color: '#58a6ff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {selectedBlock.fontRole || 'body'}
                </span>
                <span style={{ background: '#1c2128', color: '#7ee787', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {selectedBlock.area || 'default'}
                </span>
              </div>

              {selectedBlock.text !== undefined && (
                <Field label="Текст">
                  <textarea
                    value={selectedBlock.text || ''}
                    onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                    style={inputStyle}
                    rows={3}
                  />
                </Field>
              )}
              <Field label="Шрифт">
                <select value={selectedBlock.fontFamily || 'Montserrat'} onChange={(e) => updateBlock(selectedBlock.id, { fontFamily: e.target.value })} style={inputStyle}>
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
                  <input type="color" value={resolveColor(selectedBlock.colorRole || selectedBlock.textColorRole, palette, '#ffffff')} onChange={(e) => updateBlock(selectedBlock.id, selectedBlock.type === 'button' ? { textColorRole: e.target.value } : { colorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }} />
                  <input type="text" value={resolveColor(selectedBlock.colorRole || selectedBlock.textColorRole, palette, '#ffffff')} onChange={(e) => updateBlock(selectedBlock.id, selectedBlock.type === 'button' ? { textColorRole: e.target.value } : { colorRole: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </Field>
              {(selectedBlock.type === 'button' || selectedBlock.type === 'shape') && (
                <Field label="Цвет фона">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={resolveColor(selectedBlock.bgColorRole, palette, '#f59e0b')} onChange={(e) => updateBlock(selectedBlock.id, { bgColorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }} />
                    <input type="text" value={resolveColor(selectedBlock.bgColorRole, palette, '#f59e0b')} onChange={(e) => updateBlock(selectedBlock.id, { bgColorRole: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </Field>
              )}
              {/* Style hints */}
              <Field label="Стиль">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['bold', 'uppercase', 'shadow', 'italic'].map(hint => (
                    <button
                      key={hint}
                      onClick={() => updateBlock(selectedBlock.id, { styleHints: { ...selectedBlock.styleHints, [hint]: !selectedBlock.styleHints?.[hint] } })}
                      style={{
                        background: selectedBlock.styleHints?.[hint] ? '#6366f1' : '#21262d',
                        color: selectedBlock.styleHints?.[hint] ? '#fff' : '#8b949e',
                        border: '1px solid #30363d', borderRadius: '6px',
                        padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600,
                        cursor: 'pointer', textTransform: 'capitalize',
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </Field>
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
function headerBtnStyle(bg: string, color: string, primary = false): React.CSSProperties {
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
