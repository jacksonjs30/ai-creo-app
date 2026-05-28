'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { X, Download, Save, Image as ImageIcon, Type, LayoutTemplate } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { CreativeDocument, BlockSpec, TextBlock } from '@/types/creative-layout';

interface CreativeEditorProps {
  layout: any; // { background: { imageUrl: string }, document: CreativeDocument } or { backgroundUrl: string, document: CreativeDocument }
  onClose: () => void;
  onSave: (newLayout: any) => void;
}

const FONTS = ['Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Oswald', 'Playfair Display'];

export function CreativeEditor({ layout, onClose, onSave }: CreativeEditorProps) {
  const backgroundImageUrl = layout.backgroundUrl || layout.background?.imageUrl;
  const [doc, setDoc] = useState<CreativeDocument>(layout.document);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(0.55);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedBlock = doc.blocks.find(b => b.id === selectedBlockId) as TextBlock | undefined;

  const handleUpdateBlock = (id: string, updates: Partial<TextBlock>) => {
    setDoc(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => (b.id === id ? { ...b, ...updates } as BlockSpec : b))
    }));
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setSelectedBlockId(null); // Deselect to hide resize handles
    
    // Give state time to update and remove selection borders
    await new Promise(r => setTimeout(r, 100));

    try {
      const dataUrl = await htmlToImage.toPng(canvasRef.current, {
        quality: 1,
        pixelRatio: 2, // High resolution
        cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = `creative_${doc.id || Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Ошибка при экспорте изображения');
    } finally {
      setIsExporting(false);
    }
  };

  const mapAreaToPosition = (area: string) => {
    const defaultPos = { x: 540, y: 540 }; // Center of 1080x1080
    if (area.includes('top')) defaultPos.y = 150;
    if (area.includes('bottom')) defaultPos.y = 930;
    if (area.includes('under_headline')) defaultPos.y = 300;
    if (area.includes('above_cta')) defaultPos.y = 780;
    
    if (area.includes('left')) defaultPos.x = 150;
    if (area.includes('right')) defaultPos.x = 930;
    
    return defaultPos;
  };

  // Convert fontRole to initial font sizes
  const getFontSize = (block: TextBlock) => {
    if ((block as any).fontSize) return (block as any).fontSize;
    if (block.fontRole === 'display') return 80;
    if (block.fontRole === 'highlight') return 60;
    if (block.fontRole === 'badge') return 40;
    return 36; // body
  };

  // Ensure blocks have basic coordinates if they don't already
  useEffect(() => {
    let changed = false;
    const newBlocks = doc.blocks.map(b => {
      const tb = b as any;
      if (tb.x === undefined || tb.y === undefined) {
        changed = true;
        const pos = mapAreaToPosition(b.area || 'middle_center');
        return { ...b, x: pos.x, y: pos.y, width: tb.width || 800, height: tb.height || 200 };
      }
      return b;
    });
    
    if (changed) {
      setDoc(prev => ({ ...prev, blocks: newBlocks as BlockSpec[] }));
    }
  }, []);

  useEffect(() => {
    // Adjust scale based on screen height to fit the editor comfortably
    const updateScale = () => {
      const availableHeight = window.innerHeight - 60 - 64; // 60px header, 64px padding
      const newScale = Math.min(availableHeight / 1080, 0.7);
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#0f172a',
      display: 'flex', flexDirection: 'column', color: 'white'
    }}>
      {/* Header */}
      <div style={{
        height: '60px', background: '#1e293b', borderBottom: '1px solid #334155',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LayoutTemplate size={20} color="#818cf8" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Редактор креатива</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem'
          }}>
            <X size={18} /> Отмена
          </button>
          <button onClick={() => onSave({ ...layout, document: doc })} style={{
            background: '#475569', color: 'white', border: 'none', borderRadius: '6px',
            padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500
          }}>
            <Save size={16} /> Сохранить
          </button>
          <button onClick={handleExport} disabled={isExporting} style={{
            background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px',
            padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600
          }}>
            {isExporting ? 'Экспорт...' : <><Download size={16} /> Скачать PNG</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Canvas Area */}
        <div style={{
          flex: 1, background: '#0f172a', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'auto', padding: '2rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedBlockId(null);
        }}>
          {/* Scaled Wrapper to prevent scrollbars */}
          <div style={{ width: 1080 * scale, height: 1080 * scale, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            {/* Virtual 1080x1080 canvas */}
            <div style={{
              width: '1080px', height: '1080px', background: '#fff',
              position: 'absolute', top: 0, left: 0,
              transform: `scale(${scale})`, transformOrigin: 'top left',
              overflow: 'hidden'
            }}>
              {/* Background Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {backgroundImageUrl && (
                <img 
                  src={backgroundImageUrl} 
                  alt="background" 
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, pointerEvents: 'none' }} 
                />
              )}

              {/* Render Blocks */}
            <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
              {doc.blocks.map(block => {
                const b = block as any;
                const isSelected = selectedBlockId === block.id;
                
                // Colors fallback to generic names if not hex
                let color = b.colorRole || '#ffffff';
                if (color === 'textPrimary') color = doc.brandPalette?.textPrimary || '#1e293b';
                else if (color === 'accentPrimary') color = doc.brandPalette?.accentPrimary || '#f59e0b';
                
                let bgColor = b.bgColorRole || 'transparent';
                if (bgColor === 'accentPrimary') bgColor = doc.brandPalette?.accentPrimary || '#6366f1';

                const fontSize = getFontSize(b as TextBlock);
                const fontFamily = b.fontFamily || FONTS[0];
                const align = b.align || 'center';

                return (
                  <Rnd
                    key={block.id}
                    size={{ width: b.width || 800, height: b.height || 'auto' }}
                    position={{ x: b.x - (b.width || 800)/2, y: b.y - (b.height || 100)/2 }}
                    onDragStop={(e, d) => {
                      handleUpdateBlock(block.id, { x: d.x + (b.width || 800)/2, y: d.y + (b.height || 100)/2 } as any);
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      handleUpdateBlock(block.id, {
                        width: ref.style.width,
                        height: ref.style.height,
                        ...position
                      } as any);
                    }}
                    bounds="parent"
                    onClick={() => setSelectedBlockId(block.id)}
                    style={{
                      border: isSelected && !isExporting ? '2px solid #818cf8' : 'none',
                      zIndex: block.zIndex || 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
                      background: block.type === 'button' || block.type === 'shape' ? bgColor : 'transparent',
                      borderRadius: block.type === 'button' ? '12px' : (block as any).shape === 'pill' ? '99px' : '0px',
                      padding: block.type === 'button' ? '20px 40px' : '0'
                    }}
                  >
                    {block.type === 'image' ? (
                      <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.2)' }} />
                    ) : (
                      <div 
                        contentEditable={!isExporting}
                        suppressContentEditableWarning
                        onBlur={(e) => handleUpdateBlock(block.id, { text: e.currentTarget.innerText })}
                        style={{
                          width: '100%',
                          outline: 'none',
                          fontSize: `${fontSize}px`,
                          fontFamily: `${fontFamily}, sans-serif`,
                          fontWeight: block.type === 'button' || b.fontRole === 'display' ? 800 : 600,
                          color: block.type === 'button' ? (b.textColorRole || '#ffffff') : color,
                          textAlign: align as any,
                          lineHeight: 1.2,
                          textShadow: block.type === 'button' ? 'none' : '0px 2px 10px rgba(0,0,0,0.3)',
                          cursor: 'text'
                        }}
                      >
                        {(block as any).text}
                      </div>
                    )}
                  </Rnd>
                );
              })}
            </div>
          </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: '320px', background: '#1e293b', borderLeft: '1px solid #334155',
          padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>Настройки блока</h4>
          
          {selectedBlock ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Текст</label>
                <textarea 
                  value={selectedBlock.text || ''}
                  onChange={(e) => handleUpdateBlock(selectedBlock.id, { text: e.target.value })}
                  style={{
                    width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px',
                    color: 'white', padding: '0.5rem', fontSize: '0.9rem', minHeight: '80px', outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Шрифт</label>
                <select 
                  value={(selectedBlock as any).fontFamily || FONTS[0]}
                  onChange={(e) => handleUpdateBlock(selectedBlock.id, { fontFamily: e.target.value } as any)}
                  style={{
                    width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px',
                    color: 'white', padding: '0.5rem', fontSize: '0.9rem', outline: 'none'
                  }}
                >
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Размер (px)</label>
                  <input 
                    type="number" 
                    value={getFontSize(selectedBlock)}
                    onChange={(e) => handleUpdateBlock(selectedBlock.id, { fontSize: parseInt(e.target.value) } as any)}
                    style={{
                      width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px',
                      color: 'white', padding: '0.5rem', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Выравнивание</label>
                  <select 
                    value={selectedBlock.align || 'center'}
                    onChange={(e) => handleUpdateBlock(selectedBlock.id, { align: e.target.value as any })}
                    style={{
                      width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px',
                      color: 'white', padding: '0.5rem', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>Цвет текста</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={(selectedBlock.colorRole?.startsWith('#') ? selectedBlock.colorRole : doc.brandPalette?.textPrimary) || '#ffffff'}
                    onChange={(e) => handleUpdateBlock(selectedBlock.id, { colorRole: e.target.value })}
                    style={{ width: '40px', height: '40px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    value={(selectedBlock.colorRole?.startsWith('#') ? selectedBlock.colorRole : doc.brandPalette?.textPrimary) || '#ffffff'}
                    onChange={(e) => handleUpdateBlock(selectedBlock.id, { colorRole: e.target.value })}
                    style={{
                      flex: 1, background: '#0f172a', border: '1px solid #475569', borderRadius: '6px',
                      color: 'white', padding: '0.5rem', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
              Кликните на текст или кнопку на холсте, чтобы изменить их свойства.
              <br/><br/>
              Вы также можете изменять текст прямо на холсте двойным кликом.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
