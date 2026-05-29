'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { X, Download, Save, LayoutTemplate, Type, Square, Circle, Image as ImageIcon, UploadCloud, Pipette, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

export interface Asset {
  id: string;
  name: string;
  url: string; // base64
}

interface CreativeEditorProps {
  layout: any;
  assets?: Asset[];
  onClose: () => void;
  onSave: (newLayout: any) => void;
  onUploadAsset?: (asset: Asset) => void;
}

const FONTS = ['Montserrat', 'Inter', 'Roboto', 'Open Sans', 'Oswald', 'Playfair Display', 'Raleway', 'Bebas Neue'];
const CANVAS_SIZE = 1080;

function getImageUrl(layout: any): string | null {
  if (!layout) return null;
  if (layout.background?.imageUrl) return layout.background.imageUrl;
  if (typeof layout.backgroundUrl === 'string') return layout.backgroundUrl;
  if (typeof layout === 'string') return layout;
  if (layout.previewUrl) return layout.previewUrl; // if we are re-editing
  return null;
}

export function CreativeEditor({ layout, assets = [], onClose, onSave, onUploadAsset }: CreativeEditorProps) {
  const bgUrl = getImageUrl(layout);
  // We expect layout to possibly be the entire object with .document.blocks
  // OR if we saved it before, it might just be the layout object itself.
  const initialBlocks = layout?.document?.blocks || layout?.blocks || [];

  const [blocks, setBlocks] = useState<any[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(0.55);
  const [activeTab, setActiveTab] = useState<'tools' | 'assets'>('tools');
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute scale
  useEffect(() => {
    const compute = (width: number, height: number) => {
      const h = height - 48; 
      const w = width - 48;
      let s = Math.min(h / CANVAS_SIZE, w / CANVAS_SIZE, 1.0);
      if (!s || isNaN(s) || s <= 0) s = 0.55;
      setScale(Math.max(s, 0.25));
    };

    if (containerRef.current) compute(containerRef.current.clientWidth, containerRef.current.clientHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) compute(entry.contentRect.width, entry.contentRect.height);
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const updateBlock = useCallback((id: string, patch: Record<string, any>) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const addBlock = (type: string, extra: any = {}) => {
    const newId = `block_${Date.now()}`;
    const newBlock = {
      id: newId,
      type,
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      w: type === 'text' ? 600 : type === 'image' ? 300 : 400,
      h: type === 'text' ? 150 : type === 'image' ? 300 : 400,
      zIndex: blocks.length + 1,
      ...extra
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newId);
  };

  const bringForward = (id: string) => {
    const sorted = [...blocks].sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));
    const idx = sorted.findIndex(b => b.id === id);
    if (idx < sorted.length - 1) {
      const temp = sorted[idx].zIndex;
      sorted[idx].zIndex = sorted[idx+1].zIndex;
      sorted[idx+1].zIndex = temp;
      setBlocks([...sorted]);
    }
  };

  const sendBackward = (id: string) => {
    const sorted = [...blocks].sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));
    const idx = sorted.findIndex(b => b.id === id);
    if (idx > 0) {
      const temp = sorted[idx].zIndex;
      sorted[idx].zIndex = sorted[idx-1].zIndex;
      sorted[idx-1].zIndex = temp;
      setBlocks([...sorted]);
    }
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleExportAndSave = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedId(null); // hide selection borders
    await new Promise((r) => setTimeout(r, 150));
    try {
      const url = await htmlToImage.toPng(canvasRef.current, { pixelRatio: 2, cacheBust: true });
      
      const newLayout = {
        ...layout,
        previewUrl: url,
        blocks: blocks // saving layers state
      };
      
      onSave(newLayout);
    } catch (e) {
      alert('Ошибка при экспорте: ' + (e as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (onUploadAsset) {
        onUploadAsset({ id: `asset_${Date.now()}`, name: file.name, url: base64 });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const pickColor = async (blockId: string, field: string) => {
    if (!('EyeDropper' in window)) {
      alert('Ваш браузер не поддерживает инструмент Пипетка (нужен Chrome/Edge).');
      return;
    }
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      updateBlock(blockId, { [field]: result.sRGBHex });
    } catch (e) {
      console.log('EyeDropper cancelled');
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0d1117', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ height: 60, background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#e6edf3' }}>
          <LayoutTemplate size={20} color="#818cf8" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Creative Editor PRO</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={headerBtnStyle('#30363d', '#e6edf3')}>
            <X size={15} /> Отмена
          </button>
          <button onClick={handleExportAndSave} disabled={isExporting} style={headerBtnStyle('#6366f1', '#fff', true)}>
            {isExporting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            Сохранить и применить
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── Left Sidebar (Tools & Assets) ── */}
        <div style={{ width: 80, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0', gap: '1rem' }}>
          <ToolBtn icon={<Type size={20} />} label="Текст" onClick={() => addBlock('text', { text: 'Ваш текст', fontSize: 64, fontFamily: 'Montserrat', colorRole: '#ffffff', align: 'center', fontWeight: 800 })} />
          <ToolBtn icon={<Square size={20} />} label="Квадрат" onClick={() => addBlock('shape', { shape: 'rect', bgColorRole: '#3b82f6', cornerRadius: 16 })} />
          <ToolBtn icon={<Circle size={20} />} label="Круг" onClick={() => addBlock('shape', { shape: 'circle', bgColorRole: '#ef4444' })} />
          <div style={{ width: '60%', height: 1, background: '#30363d', margin: '0.5rem 0' }} />
          <ToolBtn icon={<ImageIcon size={20} />} label="Галерея" onClick={() => setActiveTab('assets')} isActive={activeTab === 'assets'} />
        </div>

        {/* Assets Drawer */}
        {activeTab === 'assets' && (
          <div style={{ width: 260, background: '#0d1117', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '0.9rem', fontWeight: 600 }}>Загрузки</h3>
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: 4 }}>
                <UploadCloud size={18} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
            </div>
            <div style={{ padding: '1rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {assets.map(asset => (
                <div key={asset.id} onClick={() => addBlock('image', { imageUrl: asset.url })} style={{ aspectRatio: '1', background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={asset.url} alt={asset.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ))}
              {assets.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', padding: '2rem 0' }}>
                  Нет загруженных файлов.<br/><br/>Нажмите иконку загрузки выше, чтобы добавить логотип.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Canvas Area ── */}
        <div
          ref={containerRef}
          onClick={() => setSelectedId(null)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090c10', overflow: 'hidden', padding: '24px' }}
        >
          <div style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale, position: 'relative', flexShrink: 0 }}>
            <div
              ref={canvasRef}
              style={{
                width: CANVAS_SIZE, height: CANVAS_SIZE,
                position: 'absolute', top: 0, left: 0,
                transform: `scale(${scale})`, transformOrigin: 'top left',
                overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
                background: '#fff',
              }}
            >
              {bgUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bgUrl} alt="Background" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
              )}
              
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                {blocks.sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0)).map((block) => {
                  const isSelected = selectedId === block.id;
                  const bx = block.x - block.w / 2;
                  const by = block.y - block.h / 2;
                  const bw = block.w;
                  const bh = block.h;

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
                          border: isSelected && !isExporting ? '3px solid #818cf8' : 'none',
                          borderRadius: block.shape === 'circle' ? '999px' : `${block.cornerRadius || 0}px`,
                          background: block.bgColorRole || '#3b82f6',
                          cursor: 'move',
                          zIndex: block.zIndex || 1
                        }}
                        enableResizing={isSelected && !isExporting}
                      >
                        <div style={{ width: '100%', height: '100%' }} />
                      </Rnd>
                    );
                  }

                  if (block.type === 'image') {
                    return (
                      <Rnd
                        key={block.id}
                        scale={scale}
                        position={{ x: bx, y: by }}
                        size={{ width: bw, height: bh }}
                        lockAspectRatio
                        onDragStop={(_e, d) => updateBlock(block.id, { x: d.x + bw / 2, y: d.y + bh / 2 })}
                        onResizeStop={(_e, _dir, ref, _delta, pos) => updateBlock(block.id, { w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x + parseInt(ref.style.width) / 2, y: pos.y + parseInt(ref.style.height) / 2 })}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(block.id); }}
                        style={{
                          border: isSelected && !isExporting ? '3px solid #818cf8' : 'none',
                          cursor: 'move',
                          zIndex: block.zIndex || 1
                        }}
                        enableResizing={isSelected && !isExporting}
                      >
                        <img src={block.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
                      </Rnd>
                    );
                  }

                  // Text block
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
                        border: isSelected && !isExporting ? '3px dashed #818cf8' : 'none',
                        display: 'flex', alignItems: 'center',
                        justifyContent: block.align === 'center' ? 'center' : block.align === 'left' ? 'flex-start' : 'flex-end',
                        cursor: 'move',
                        zIndex: block.zIndex || 1,
                        background: block.bgColorRole || 'transparent',
                        borderRadius: `${block.cornerRadius || 0}px`,
                        padding: block.bgColorRole && block.bgColorRole !== 'transparent' ? '16px' : '0'
                      }}
                      enableResizing={isSelected && !isExporting}
                    >
                      <div
                        contentEditable={!isExporting && isSelected}
                        suppressContentEditableWarning
                        onBlur={(e) => updateBlock(block.id, { text: e.currentTarget.innerText })}
                        style={{
                          width: '100%', outline: 'none', cursor: isSelected ? 'text' : 'move',
                          fontSize: `${block.fontSize || 32}px`,
                          fontFamily: `'${block.fontFamily || 'Montserrat'}', sans-serif`,
                          fontWeight: block.fontWeight || 600,
                          color: block.colorRole || '#ffffff',
                          textAlign: block.align as any || 'center',
                          lineHeight: 1.15,
                          textTransform: block.styleHints?.uppercase ? 'uppercase' : 'none',
                          fontStyle: block.styleHints?.italic ? 'italic' : 'normal',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {block.text}
                      </div>
                    </Rnd>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar (Properties) ── */}
        <div style={{ width: 300, background: '#161b22', borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
          {selectedBlock ? (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e6edf3', fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                  {selectedBlock.type === 'shape' ? 'Фигура' : selectedBlock.type === 'image' ? 'Изображение' : 'Текст'}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => bringForward(selectedBlock.id)} title="Выше" style={iconBtnStyle}><ChevronUp size={16} /></button>
                  <button onClick={() => sendBackward(selectedBlock.id)} title="Ниже" style={iconBtnStyle}><ChevronDown size={16} /></button>
                  <button onClick={() => deleteBlock(selectedBlock.id)} title="Удалить" style={{...iconBtnStyle, color: '#f87171'}}><Trash2 size={16} /></button>
                </div>
              </div>

              {selectedBlock.type === 'text' && (
                <>
                  <Field label="Текст">
                    <textarea value={selectedBlock.text || ''} onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })} style={inputStyle} rows={3} />
                  </Field>
                  <Field label="Шрифт">
                    <select value={selectedBlock.fontFamily || 'Montserrat'} onChange={(e) => updateBlock(selectedBlock.id, { fontFamily: e.target.value })} style={inputStyle}>
                      {FONTS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </Field>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Field label="Размер (px)" style={{ flex: 1 }}>
                      <input type="number" value={selectedBlock.fontSize || 32} onChange={(e) => updateBlock(selectedBlock.id, { fontSize: +e.target.value })} style={inputStyle} />
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
                      <input type="color" value={selectedBlock.colorRole || '#ffffff'} onChange={(e) => updateBlock(selectedBlock.id, { colorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                      <input type="text" value={selectedBlock.colorRole || '#ffffff'} onChange={(e) => updateBlock(selectedBlock.id, { colorRole: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => pickColor(selectedBlock.id, 'colorRole')} style={iconBtnStyle} title="Пипетка"><Pipette size={16}/></button>
                    </div>
                  </Field>
                </>
              )}

              {(selectedBlock.type === 'shape' || selectedBlock.type === 'text') && (
                <Field label={selectedBlock.type === 'text' ? 'Фон текста' : 'Цвет фигуры'}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={selectedBlock.bgColorRole || '#transparent'} onChange={(e) => updateBlock(selectedBlock.id, { bgColorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                    <input type="text" value={selectedBlock.bgColorRole || 'transparent'} onChange={(e) => updateBlock(selectedBlock.id, { bgColorRole: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => pickColor(selectedBlock.id, 'bgColorRole')} style={iconBtnStyle} title="Пипетка"><Pipette size={16}/></button>
                  </div>
                </Field>
              )}
              
              {selectedBlock.type === 'shape' && selectedBlock.shape === 'rect' && (
                <Field label="Скругление углов (px)">
                  <input type="number" value={selectedBlock.cornerRadius || 0} onChange={(e) => updateBlock(selectedBlock.id, { cornerRadius: +e.target.value })} style={inputStyle} />
                </Field>
              )}

            </div>
          ) : (
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: '#8b949e', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
                Выберите элемент на холсте или добавьте новый из панели слева.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', ...style }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e' }}>{label}</label>
      {children}
    </div>
  );
}

function ToolBtn({ icon, label, onClick, isActive }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        background: 'none', border: 'none',
        color: isActive ? '#818cf8' : '#8b949e',
        cursor: 'pointer', padding: '8px',
        borderRadius: '8px',
        backgroundColor: isActive ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
      }}
    >
      {icon}
      <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{label}</span>
    </button>
  );
}

const inputStyle = {
  background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3',
  padding: '0.5rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const,
};

const iconBtnStyle = {
  background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9',
  width: 32, height: 32, borderRadius: '6px', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
};

function headerBtnStyle(bg: string, color: string, glow = false) {
  return {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: bg, color: color, border: '1px solid rgba(255,255,255,0.1)',
    padding: '0.4rem 0.8rem', borderRadius: '6px',
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: glow ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none',
  };
}
