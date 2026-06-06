'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { X, Download, Save, LayoutTemplate, Type, Square, Circle, Image as ImageIcon, UploadCloud, Pipette, Trash2, ChevronUp, ChevronDown, Loader2, RotateCw } from 'lucide-react';
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

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#ffffff',
  border: '2px solid #818cf8',
  borderRadius: '50%',
};

const resizeHandleStyles = {
  bottomRight: { ...handleStyle, right: '-6px', bottom: '-6px' },
  bottomLeft: { ...handleStyle, left: '-6px', bottom: '-6px' },
  topRight: { ...handleStyle, right: '-6px', top: '-6px' },
  topLeft: { ...handleStyle, left: '-6px', top: '-6px' },
  left: { ...handleStyle, left: '-6px', top: '50%', transform: 'translateY(-50%)' },
  right: { ...handleStyle, right: '-6px', top: '50%', transform: 'translateY(-50%)' },
  top: { ...handleStyle, top: '-6px', left: '50%', transform: 'translateX(-50%)' },
  bottom: { ...handleStyle, bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }
};

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
  const [isEditingText, setIsEditingText] = useState(false);
  const [scale, setScale] = useState(0.55);
  const [activeTab, setActiveTab] = useState<'tools' | 'assets'>('tools');
  const [snapLines, setSnapLines] = useState<{x?: number, y?: number}>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Copy/Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'DIV' && activeEl.getAttribute('contenteditable') === 'true') return;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

        if (selectedId) {
          const blockToCopy = blocks.find(b => b.id === selectedId);
          if (blockToCopy) localStorage.setItem('copiedBlock', JSON.stringify(blockToCopy));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'DIV' && activeEl.getAttribute('contenteditable') === 'true') return;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        
        const copied = localStorage.getItem('copiedBlock');
        if (copied) {
          try {
            const parsed = JSON.parse(copied);
            const newId = `block_${Date.now()}`;
            const newBlock = { ...parsed, id: newId, x: parsed.x + 20, y: parsed.y + 20, zIndex: blocks.length + 1 };
            setBlocks(prev => [...prev, newBlock]);
            setSelectedId(newId);
          } catch(err) {}
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'DIV' && activeEl.getAttribute('contenteditable') === 'true') return;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        deleteBlock(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, blocks]);

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
      h: type === 'text' ? 'auto' : type === 'image' ? 300 : 400,
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

  const handleRotateStart = (e: React.MouseEvent, block: any) => {
    e.stopPropagation();
    e.preventDefault();
    const startAngle = block.rotation || 0;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + (block.x * scale);
    const centerY = rect.top + (block.y * scale);

    const startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentMouseAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
      let diff = currentMouseAngle - startMouseAngle;
      updateBlock(block.id, { rotation: Math.round(startAngle + diff) });
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleCustomResize = (e: React.MouseEvent, block: any, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const node = document.getElementById(`block-${block.id}`);
    if (!rect || !node) return;
    
    const actualH = block.h === 'auto' ? node.offsetHeight : block.h;
    
    const startCx = rect.left + (block.x * scale);
    const startCy = rect.top + (block.y * scale);
    const theta = (block.rotation || 0) * (Math.PI / 180);
    
    let oppLx = 0, oppLy = 0;
    if (handle.includes('right')) oppLx = -block.w / 2;
    if (handle.includes('left')) oppLx = block.w / 2;
    if (handle.includes('bottom')) oppLy = -actualH / 2;
    if (handle.includes('top')) oppLy = actualH / 2;
    
    const oppX = startCx + (oppLx * Math.cos(theta) - oppLy * Math.sin(theta)) * scale;
    const oppY = startCy + (oppLx * Math.sin(theta) + oppLy * Math.cos(theta)) * scale;

    const startW = block.w;
    const startH = actualH;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const mx = moveEvent.clientX;
      const my = moveEvent.clientY;
      
      const lx = ((mx - oppX) * Math.cos(-theta) - (my - oppY) * Math.sin(-theta)) / scale;
      const ly = ((mx - oppX) * Math.sin(-theta) + (my - oppY) * Math.cos(-theta)) / scale;
      
      let newW = block.w;
      let newH = startH;
      
      if (handle.includes('right')) newW = Math.max(20, lx);
      if (handle.includes('left')) newW = Math.max(20, -lx);
      if (handle.includes('bottom')) newH = Math.max(20, ly);
      if (handle.includes('top')) newH = Math.max(20, -ly);

      if (block.type === 'image' && handle.length > 6) {
         const ratio = startW / startH;
         if (newW / ratio > newH) newH = newW / ratio;
         else newW = newH * ratio;
      }
      
      let newCxLocal = 0;
      let newCyLocal = 0;
      
      if (handle.includes('right')) newCxLocal = newW / 2;
      if (handle.includes('left')) newCxLocal = -newW / 2;
      if (handle.includes('bottom')) newCyLocal = newH / 2;
      if (handle.includes('top')) newCyLocal = -newH / 2;
      
      const newCxScreen = oppX + (newCxLocal * Math.cos(theta) - newCyLocal * Math.sin(theta)) * scale;
      const newCyScreen = oppY + (newCxLocal * Math.sin(theta) + newCyLocal * Math.cos(theta)) * scale;
      
      const finalX = (newCxScreen - rect.left) / scale;
      const finalY = (newCyScreen - rect.top) / scale;
      
      let newFontSize = block.fontSize;
      if (block.type === 'text') {
         if (handle === 'top' || handle === 'bottom') {
            const ratioH = newH / startH;
            newFontSize = Math.max(8, Math.round((block.fontSize || 32) * ratioH));
            newW = Math.max(20, startW * ratioH);
         } else if (handle.includes('left') || handle.includes('right')) {
            const ratioW = newW / startW;
            // Only scale font on corners. Left/right edge just changes wrapping.
            if (handle.length > 6) { // It's a corner like topLeft, bottomRight
               newFontSize = Math.max(8, Math.round((block.fontSize || 32) * ratioW));
            }
         }
      }
      
      updateBlock(block.id, { 
         w: Math.round(newW), 
         h: block.type === 'text' ? 'auto' : Math.round(newH), 
         x: Math.round(finalX), 
         y: Math.round(finalY),
         fontSize: newFontSize
      });
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDrag = (e: any, d: any, block: any) => {
    const w = parseInt(d.node.style.width) || block.w;
    const h = parseInt(d.node.style.height) || block.h || 150;
    const centerX = d.x + w / 2;
    const centerY = d.y + h / 2;
    const newSnap: any = {};
    if (Math.abs(centerX - CANVAS_SIZE / 2) < 4) newSnap.x = CANVAS_SIZE / 2;
    if (Math.abs(centerY - CANVAS_SIZE / 2) < 4) newSnap.y = CANVAS_SIZE / 2;
    setSnapLines(newSnap);
  };

  const handleDragStop = (e: any, d: any, block: any) => {
    const w = parseInt(d.node.style.width) || block.w;
    const h = parseInt(d.node.style.height) || block.h || 150;
    let finalX = d.x + w / 2;
    let finalY = d.y + h / 2;
    if (Math.abs(finalX - CANVAS_SIZE / 2) < 4) finalX = CANVAS_SIZE / 2;
    if (Math.abs(finalY - CANVAS_SIZE / 2) < 4) finalY = CANVAS_SIZE / 2;
    updateBlock(block.id, { x: finalX, y: finalY });
    setSnapLines({});
  };

  const handleExportAndSave = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedId(null); // hide selection borders
    await new Promise((r) => setTimeout(r, 150));
    try {
      // Force scale(1) so htmlToImage captures the true 1080x1080 canvas 
      // instead of the visual scaled-down one.
      const url = await htmlToImage.toJpeg(canvasRef.current, { 
        quality: 0.85,
        pixelRatio: 1,
        canvasWidth: CANVAS_SIZE,
        canvasHeight: CANVAS_SIZE,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${CANVAS_SIZE}px`,
          height: `${CANVAS_SIZE}px`
        },
        cacheBust: true 
      });
      
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
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > 1080 || h > 1080) {
          const ratio = Math.min(1080 / w, 1080 / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        const base64 = cvs.toDataURL('image/png'); 
        if (onUploadAsset) {
          onUploadAsset({ id: `asset_${Date.now()}`, name: file.name, url: base64 });
        }
      };
      img.src = src;
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  if (!mounted) return null;

  return createPortal(
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
                {snapLines.x && <div style={{ position: 'absolute', top: 0, bottom: 0, left: snapLines.x, width: 2, background: '#f43f5e', zIndex: 9999, pointerEvents: 'none' }} />}
                {snapLines.y && <div style={{ position: 'absolute', left: 0, right: 0, top: snapLines.y, height: 2, background: '#f43f5e', zIndex: 9999, pointerEvents: 'none' }} />}
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
                        onDrag={(e, d) => handleDrag(e, d, block)}
                        onDragStop={(e, d) => handleDragStop(e, d, block)}
                        onResizeStop={(_e, _dir, ref, _delta, pos) => updateBlock(block.id, { w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x + parseInt(ref.style.width) / 2, y: pos.y + parseInt(ref.style.height) / 2 })}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(block.id); }}
                        style={{
                          cursor: 'move',
                          zIndex: block.zIndex || 1
                        }}
                        enableResizing={false}
                        resizeHandleStyles={resizeHandleStyles}
                      >
                        <div id={`block-${block.id}`} style={{ position: 'relative', width: '100%', height: '100%', transform: `rotate(${block.rotation || 0}deg)`, borderRadius: block.shape === 'circle' ? '999px' : `${block.cornerRadius || 0}px`, background: block.useGradient ? `linear-gradient(135deg, ${block.bgColorRole || '#3b82f6'}, ${block.gradientTo || '#000000'})` : (block.bgColorRole || '#3b82f6'), border: isSelected && !isExporting ? '2px solid #818cf8' : 'none' }}>
                          {isSelected && !isExporting && (
                            <div onMouseDown={(e) => handleRotateStart(e, block)} style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', width: 24, height: 24, background: '#fff', border: '2px solid #818cf8', borderRadius: '50%', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                              <RotateCw size={12} />
                            </div>
                          )}
                          {isSelected && !isExporting && ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'top', 'bottom', 'left', 'right'].map(h => (
                            <div key={h} onMouseDown={(e) => handleCustomResize(e, block, h)} style={{ position: 'absolute', width: 12, height: 12, background: '#fff', border: '2px solid #818cf8', borderRadius: '50%', ...getHandleStyle(h) }} />
                          ))}
                        </div>
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
                        onDrag={(e, d) => handleDrag(e, d, block)}
                        onDragStop={(e, d) => handleDragStop(e, d, block)}
                        onResizeStop={(_e, _dir, ref, _delta, pos) => updateBlock(block.id, { w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x + parseInt(ref.style.width) / 2, y: pos.y + parseInt(ref.style.height) / 2 })}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(block.id); }}
                        style={{
                          cursor: 'move',
                          zIndex: block.zIndex || 1
                        }}
                        enableResizing={false}
                        resizeHandleStyles={resizeHandleStyles}
                      >
                        <div id={`block-${block.id}`} style={{ position: 'relative', width: '100%', height: '100%', transform: `rotate(${block.rotation || 0}deg)`, border: isSelected && !isExporting ? '2px solid #818cf8' : 'none' }}>
                          <img src={block.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
                          {isSelected && !isExporting && (
                            <div onMouseDown={(e) => handleRotateStart(e, block)} style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', width: 24, height: 24, background: '#fff', border: '2px solid #818cf8', borderRadius: '50%', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                              <RotateCw size={12} />
                            </div>
                          )}
                          {isSelected && !isExporting && ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'top', 'bottom', 'left', 'right'].map(h => (
                            <div key={h} onMouseDown={(e) => handleCustomResize(e, block, h)} style={{ position: 'absolute', width: 12, height: 12, background: '#fff', border: '2px solid #818cf8', borderRadius: '50%', ...getHandleStyle(h) }} />
                          ))}
                        </div>
                      </Rnd>
                    );
                  }

                  // Text block
                  return (
                    <Rnd
                      key={block.id}
                      scale={scale}
                      position={{ x: block.x - block.w / 2, y: block.y - (block.h === 'auto' ? 0 : block.h / 2) }}
                      size={{ width: block.w, height: 'auto' }}
                      lockAspectRatio={false}
                      disableDragging={isEditingText && isSelected}
                      onDrag={(e, d) => handleDrag(e, d, block)}
                      onDragStop={(e, d) => handleDragStop(e, d, block)}
                      onResizeStop={(_e, dir, ref, _delta, pos) => {
                        const newW = parseInt(ref.style.width);
                        const isCorner = dir.includes('top') || dir.includes('bottom');
                        let newFontSize = block.fontSize || 32;
                        if (isCorner) {
                          const scaleRatio = newW / block.w;
                          newFontSize = Math.max(8, Math.round(newFontSize * scaleRatio));
                        }
                        updateBlock(block.id, { 
                          w: newW, 
                          h: 'auto',
                          x: pos.x + newW / 2, 
                          y: pos.y + ref.offsetHeight / 2,
                          fontSize: newFontSize
                        });
                      }}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(block.id); }}
                      style={{
                        cursor: isEditingText && isSelected ? 'text' : 'move',
                        zIndex: block.zIndex || 1,
                      }}
                      enableResizing={false}
                      resizeHandleStyles={resizeHandleStyles}
                    >
                      <div
                        id={`block-${block.id}`}
                        style={{
                          position: 'relative',
                          width: '100%', height: '100%', transform: `rotate(${block.rotation || 0}deg)`,
                          display: 'flex', alignItems: 'center',
                          justifyContent: block.align === 'center' ? 'center' : block.align === 'left' ? 'flex-start' : 'flex-end',
                          background: block.bgColorRole || 'transparent',
                          borderRadius: `${block.cornerRadius || 0}px`,
                          padding: block.bgColorRole && block.bgColorRole !== 'transparent' ? '16px' : '0',
                          border: isSelected && !isExporting ? '2px dashed #818cf8' : 'none'
                        }}
                      >
                        <div
                          contentEditable={isEditingText}
                          suppressContentEditableWarning
                          onDoubleClick={() => setIsEditingText(true)}
                          onBlur={(e) => {
                            setIsEditingText(false);
                            updateBlock(block.id, { text: e.currentTarget.innerText });
                          }}
                          onMouseDown={(e) => {
                            if (isEditingText && isSelected) e.stopPropagation();
                          }}
                          style={{
                            width: '100%', outline: 'none', 
                            cursor: isEditingText && isSelected ? 'text' : 'inherit',
                            fontSize: `${block.fontSize || 32}px`,
                            fontFamily: `'${block.fontFamily || 'Montserrat'}', sans-serif`,
                            fontWeight: block.fontWeight || 600,
                            color: block.colorRole || '#ffffff',
                            textAlign: block.align as any || 'center',
                            lineHeight: 1.15,
                            textTransform: block.styleHints?.uppercase ? 'uppercase' : 'none',
                            fontStyle: block.styleHints?.italic ? 'italic' : 'normal',
                            whiteSpace: 'pre-wrap',
                            textShadow: block.hasShadow ? '0px 4px 12px rgba(0,0,0,0.5)' : 'none',
                            overflow: 'hidden'
                          }}
                        >
                          {block.text}
                        </div>
                        {isSelected && !isExporting && !isEditingText && (
                          <div onMouseDown={(e) => handleRotateStart(e, block)} style={{ position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)', width: 24, height: 24, background: '#fff', border: '2px solid #818cf8', borderRadius: '50%', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                            <RotateCw size={12} />
                          </div>
                        )}
                        {isSelected && !isExporting && !isEditingText && ['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'top', 'bottom', 'left', 'right'].map(h => (
                          <div key={h} onMouseDown={(e) => handleCustomResize(e, block, h)} style={{ position: 'absolute', width: 12, height: 12, background: '#fff', border: '2px solid #818cf8', borderRadius: '50%', ...getHandleStyle(h) }} />
                        ))}
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
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Field label="Цвет текста" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={selectedBlock.colorRole || '#ffffff'} onChange={(e) => updateBlock(selectedBlock.id, { colorRole: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <button onClick={() => pickColor(selectedBlock.id, 'colorRole')} style={iconBtnStyle} title="Пипетка"><Pipette size={16}/></button>
                      </div>
                    </Field>
                    <Field label="Тень" style={{ flex: 1 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0.5rem 0' }}>
                        <input type="checkbox" checked={selectedBlock.hasShadow || false} onChange={(e) => updateBlock(selectedBlock.id, { hasShadow: e.target.checked })} />
                        <span style={{ fontSize: '0.8rem', color: '#e6edf3' }}>Включить тень</span>
                      </label>
                    </Field>
                  </div>
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
              
              {selectedBlock.type === 'shape' && (
                <>
                  <Field label="Градиент">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '0.5rem' }}>
                      <input type="checkbox" checked={selectedBlock.useGradient || false} onChange={(e) => updateBlock(selectedBlock.id, { useGradient: e.target.checked })} />
                      <span style={{ fontSize: '0.8rem', color: '#e6edf3' }}>Использовать градиент</span>
                    </label>
                  </Field>
                  {selectedBlock.useGradient && (
                    <Field label="Второй цвет градиента">
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="color" value={selectedBlock.gradientTo || '#000000'} onChange={(e) => updateBlock(selectedBlock.id, { gradientTo: e.target.value })} style={{ width: 38, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <input type="text" value={selectedBlock.gradientTo || '#000000'} onChange={(e) => updateBlock(selectedBlock.id, { gradientTo: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => pickColor(selectedBlock.id, 'gradientTo')} style={iconBtnStyle} title="Пипетка"><Pipette size={16}/></button>
                      </div>
                    </Field>
                  )}
                </>
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
    </div>,
    document.body
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

const getHandleStyle = (h: string) => {
  const off = -6;
  const style: any = {};
  if (h.includes('top')) style.top = off;
  if (h.includes('bottom')) style.bottom = off;
  if (h.includes('left')) style.left = off;
  if (h.includes('right')) style.right = off;
  
  if (h === 'top' || h === 'bottom') {
     style.left = '50%';
     style.transform = 'translateX(-50%)';
     style.cursor = 'ns-resize';
  } else if (h === 'left' || h === 'right') {
     style.top = '50%';
     style.transform = 'translateY(-50%)';
     style.cursor = 'ew-resize';
  } else if (h === 'topLeft' || h === 'bottomRight') {
     style.cursor = 'nwse-resize';
  } else {
     style.cursor = 'nesw-resize';
  }
  return style;
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
