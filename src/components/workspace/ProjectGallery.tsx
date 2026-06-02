'use client';

import React, { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { CreativeCard, extractOverlay } from './CreativeCard';
import { CreativeEditor } from './CreativeEditor';
import { Image as ImageIcon } from 'lucide-react';

const robustParseTableLine = (line: string): string[] => {
  const parts = line.split('|');
  const result: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    if (i === parts.length - 1 && parts[i].trim() === '') continue;
    result.push(parts[i].trim());
  }
  return result;
};

const parseTableRows = (content: string): string[][] => {
  const cleaned = content.replace(/^```(?:markdown|html)?\n?/i, '').replace(/```$/i, '').replace(/\|\s*\|---/g, '|\n|---').trim();
  const lines = cleaned.split('\n').filter(l => l.trim().startsWith('|'));
  return lines
    .filter(l => !l.replace(/\|/g, '').replace(/-/g, '').trim().startsWith('') || l.replace(/[|\-\s]/g, '').length > 0)
    .filter(l => !l.replace(/\|/g, '').replace(/-+/g, '').trim() === false)
    .map(l => robustParseTableLine(l))
    .filter(row => !row.every(cell => /^-+$/.test(cell.replace(/\s/g, ''))));
};

type GalleryItem = {
  scriptId: string;
  dataRowIdx: number;
  imgIdx: number;
  imgData: any;
  finalImageUrl: string;
  overlay: any;
  scriptObj: any;
};

export default function ProjectGallery({ id }: { id: string }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [editingLayout, setEditingLayout] = useState<{ scriptId: string, rowIdx: number, imgIdx: number, layoutData: any } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const savedScripts = await get(`projectScripts_${id}`) || [];
      setScripts(savedScripts);
      
      const savedAssets = await get(`projectAssets_${id}`) || [];
      setProjectAssets(savedAssets);

      const galleryItems: GalleryItem[] = [];

      [...savedScripts].reverse().forEach((script: any) => {
        const tableRows = parseTableRows(script.content || '');
        const dataRows = tableRows.slice(1);
        const rowImages = script.rowImages || {};

        dataRows.forEach((row, dataRowIdx) => {
          const imgs = rowImages[dataRowIdx] || [];
          imgs.forEach((imgData: any, imgIdx: number) => {
            const finalImageUrl = typeof imgData === 'string' 
              ? imgData 
              : (imgData?.previewUrl || imgData?.backgroundUrl || imgData?.background?.imageUrl || '');
            
            galleryItems.push({
              scriptId: script.id,
              dataRowIdx,
              imgIdx,
              imgData,
              finalImageUrl,
              overlay: extractOverlay(row),
              scriptObj: script
            });
          });
        });
      });

      setItems(galleryItems.reverse());
    };
    loadData();
  }, [id]);

  const handleDelete = async (scriptId: string, rowIdx: number, imgIdx: number) => {
    if (!window.confirm('Удалить этот креатив из галереи? (Он также удалится из сценария)')) return;

    const newScripts = [...scripts];
    const sIdx = newScripts.findIndex(s => s.id === scriptId);
    if (sIdx !== -1) {
      const s = { ...newScripts[sIdx] };
      const newRowImgs = { ...s.rowImages };
      const rImgs = [...(newRowImgs[rowIdx] || [])];
      rImgs.splice(imgIdx, 1);
      newRowImgs[rowIdx] = rImgs;
      s.rowImages = newRowImgs;
      newScripts[sIdx] = s;
      
      await set(`projectScripts_${id}`, newScripts);
      setScripts(newScripts);
      
      setItems(prev => prev.filter(item => 
        !(item.scriptId === scriptId && item.dataRowIdx === rowIdx && item.imgIdx === imgIdx)
      ));
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ImageIcon size={24} color="var(--primary)" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Галерея Креативов</h2>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <ImageIcon size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Галерея пуста</h3>
          <p style={{ color: '#64748b' }}>Здесь появятся сгенерированные изображения и видео из ваших сценариев.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {items.map((item, idx) => (
            <CreativeCard
              key={`${item.scriptId}_${item.dataRowIdx}_${item.imgIdx}_${idx}`}
              index={idx + 1}
              imageUrl={item.finalImageUrl}
              overlay={item.overlay}
              onDelete={() => handleDelete(item.scriptId, item.dataRowIdx, item.imgIdx)}
              onEdit={() => {
                const layoutData = typeof item.imgData === 'object' && item.imgData.layoutData ? item.imgData.layoutData : null;
                setEditingLayout({ scriptId: item.scriptId, rowIdx: item.dataRowIdx, imgIdx: item.imgIdx, layoutData: layoutData || item.imgData });
              }}
            />
          ))}
        </div>
      )}

      {editingLayout && (
        <CreativeEditor
          layout={editingLayout.layoutData}
          assets={projectAssets}
          onClose={() => setEditingLayout(null)}
          onUploadAsset={async (asset) => {
            const newAssets = [asset, ...projectAssets];
            setProjectAssets(newAssets);
            await set(`projectAssets_${id}`, newAssets);
          }}
          onSave={async (newLayout) => {
            const newScripts = [...scripts];
            const sIdx = newScripts.findIndex(s => s.id === editingLayout.scriptId);
            if (sIdx !== -1) {
              const s = { ...newScripts[sIdx] };
              const newRowImgs = { ...s.rowImages };
              const rImgs = [...(newRowImgs[editingLayout.rowIdx] || [])];
              rImgs[editingLayout.imgIdx] = {
                ...rImgs[editingLayout.imgIdx],
                previewUrl: newLayout.previewUrl,
                layoutData: newLayout
              };
              newRowImgs[editingLayout.rowIdx] = rImgs;
              s.rowImages = newRowImgs;
              newScripts[sIdx] = s;
              
              await set(`projectScripts_${id}`, newScripts);
              setScripts(newScripts);
              
              setItems(prev => prev.map(item => {
                if (item.scriptId === editingLayout.scriptId && item.dataRowIdx === editingLayout.rowIdx && item.imgIdx === editingLayout.imgIdx) {
                  return {
                    ...item,
                    imgData: rImgs[editingLayout.imgIdx],
                    finalImageUrl: newLayout.previewUrl
                  };
                }
                return item;
              }));
            }
            setEditingLayout(null);
          }}
        />
      )}
    </div>
  );
}
