'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Copy, CheckCircle2, ArrowLeft, Plus, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { get, set } from 'idb-keyval';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CreativeCard, extractOverlay } from './CreativeCard';
import { CreativeEditor } from './CreativeEditor';

const remarkPluginsList = [remarkGfm];
const rehypePluginsList = [rehypeRaw];

const robustParseTableLine = (line: string): string[] => {
  const parts = line.split('|');
  const result: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    if (i === parts.length - 1 && parts[i].trim() === '') {
      continue;
    }
    result.push(parts[i].trim());
  }
  return result;
};

export default function ScriptStudio({ id }: { id: string }) {
  const [project, setProject] = useState<any>(null);
  const [scripts, setScripts] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editTableData, setEditTableData] = useState<string[][]>([]);
  const [editOtherText, setEditOtherText] = useState<{ before: string, after: string }>({ before: '', after: '' });
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [generatingImages, setGeneratingImages] = useState<{ scriptId: string, rowIdx: number, action: 'add' | 'replace', imgIdx?: number }[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null);
  const [isUpdatingBrief, setIsUpdatingBrief] = useState<string | null>(null);
  
  // State for inline text editing
  const [activeEditCell, setActiveEditCell] = useState<string | null>(null);
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({});
  
  const [editingLayout, setEditingLayout] = useState<{ scriptId: string, rowIdx: number, imgIdx: number, layoutData: any } | null>(null);
  const [projectAssets, setProjectAssets] = useState<{ id: string, name: string, url: string }[]>([]);

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [generationModal, setGenerationModal] = useState<{
    isOpen: boolean;
    selectedIds: {script: any, rowIdx: number, cells: string[]}[];
    quantity: number;
    useBrandColors: boolean;
    userNotes: string;
    enhancePrompt: boolean;
  } | null>(null);

  const [globalEnhancePrompt, setGlobalEnhancePrompt] = useState<boolean>(true);
  const [globalImageFormat, setGlobalImageFormat] = useState<string>('1024x1024');


  const [filterFormat, setFilterFormat] = useState<string>('Все');
  const [filterProduct, setFilterProduct] = useState<string>('Все');
  const [filterAvatar, setFilterAvatar] = useState<string>('Все');

  const formatOptions = ['Все', ...Array.from(new Set(scripts.map(s => s.format).filter(Boolean)))];
  const productOptions = ['Все', ...Array.from(new Set(scripts.map(s => s.productName || project?.name || project?.productName || 'Неизвестно').filter(Boolean)))];
  const avatarOptions = ['Все', ...Array.from(new Set(scripts.map(s => s.avatarName).filter(Boolean)))];

  const filteredScripts = scripts.filter(s => {
    if (filterFormat !== 'Все' && s.format !== filterFormat) return false;
    if (filterAvatar !== 'Все' && s.avatarName !== filterAvatar) return false;
    const sProduct = s.productName || project?.name || project?.productName || 'Неизвестно';
    if (filterProduct !== 'Все' && sProduct !== filterProduct) return false;
    return true;
  });

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      setIsLoading(true);

      // Load scripts from IndexedDB (fallback to localStorage)
      const scriptsKey = `projectScripts_${id}`;
      let savedScripts = await get(scriptsKey);
      if (!savedScripts) {
        const oldLocal = localStorage.getItem(scriptsKey);
        savedScripts = oldLocal ? JSON.parse(oldLocal) : [];
      }
      
      const assetsKey = `projectAssets_${id}`;
      let loadedAssets = await get(assetsKey);
      if (!loadedAssets) {
        const oldAssets = localStorage.getItem(assetsKey);
        loadedAssets = oldAssets ? JSON.parse(oldAssets) : [];
      }
      setProjectAssets(loadedAssets);
      
      // Load scripts from Database (if available in brief)
      let dbScripts: any[] = [];
      if (id && id !== 'temp-id') {
        try {
          const res = await fetch(`/api/projects?id=${id}`);
          if (res.ok) {
            const data = await res.json();
            const proj = data.project || data.product || data;
            setProject(proj);
            if (proj?.brief?.scripts) {
              dbScripts = proj.brief.scripts;
            }
          }
        } catch (e) { }
      } else {
        const localBrief = localStorage.getItem('tempBrief');
        if (localBrief) setProject({ name: JSON.parse(localBrief).productName });
      }

      // Merge scripts (unique by ID)
      const allScriptsMap = new Map();
      [...dbScripts, ...savedScripts].forEach(s => {
        allScriptsMap.set(s.id, s);
      });
      const mergedScripts = Array.from(allScriptsMap.values()).sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      setScripts(mergedScripts);
      // Update IndexedDB with merged data to keep it in sync
      if (mergedScripts.length > 0) {
        await set(scriptsKey, mergedScripts);
      }
      setIsLoading(false);
    }

    loadData();
  }, [id]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (!window.confirm('Удалить этот пак сценариев?')) return;
    const updatedScripts = scripts.filter(s => s.id !== scriptId);
    setScripts(updatedScripts);
    await set(`projectScripts_${id}`, updatedScripts);
  };

  const handleSaveEdit = async (scriptId: string) => {
    const tableStr = editTableData.map(row => `| ${row.join(' | ')} |`).join('\n');
    const newContent = `${editOtherText.before}\n${tableStr}\n${editOtherText.after}`.trim();

    const updatedScripts = scripts.map(s => {
      if (s.id === scriptId) {
        return { ...s, content: newContent };
      }
      return s;
    });
    setScripts(updatedScripts);
    await set(`projectScripts_${id}`, updatedScripts);
    setEditingScriptId(null);
  };

  const updateTableCell = async (scriptId: string, rIdx: number, cIdx: number, newValue: string) => {
    let finalScripts: any[] | null = null;
    
    setScripts(prevScripts => {
      const newScripts = [...prevScripts];
      const sIdx = newScripts.findIndex(s => s.id === scriptId);
      if (sIdx === -1) return prevScripts;
      
      const targetScript = { ...newScripts[sIdx] };
      const lines = targetScript.content.split('\n');
      const tableLines = lines.filter((l: string) => l.trim().startsWith('|'));
      if (tableLines.length === 0) return prevScripts;
      
      const firstTableIdx = lines.indexOf(tableLines[0]);
      const lastTableIdx = lines.indexOf(tableLines[tableLines.length - 1]);
      const before = lines.slice(0, firstTableIdx).join('\n');
      const after = lines.slice(lastTableIdx + 1).join('\n');
      
      const parsedData = tableLines.map((line: string) => {
        return robustParseTableLine(line);
      });
      
      const targetRowIdx = rIdx + 2; // header and separator
      if (parsedData[targetRowIdx] && parsedData[targetRowIdx][cIdx] !== undefined) {
        parsedData[targetRowIdx][cIdx] = newValue.replace(/\n/g, '<br>');
        const tableStr = parsedData.map((r: string[]) => `| ${r.join(' | ')} |`).join('\n');
        targetScript.content = `${before}\n${tableStr}\n${after}`.trim();
        newScripts[sIdx] = targetScript;
        finalScripts = newScripts;
        return newScripts;
      }
      return prevScripts;
    });

    if (finalScripts) {
      await set(`projectScripts_${id}`, finalScripts);
    }
  };

  const handleBriefAIUpdate = async (script: any, rIdx: number, newText: string, oldBrief: string) => {
    const rowKey = `${script.id}_row${rIdx}`;
    setIsUpdatingBrief(rowKey);
    try {
      const res = await fetch('/api/update-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newText,
          oldBrief,
          format: script.format,
          avatarName: script.avatarName,
          productName: script.productName || project?.name,
          userNotes: rowNotes[rowKey] || ''
        })
      });
      const data = await res.json();
      if (res.ok && data.updatedBrief) {
        const parsed = parseTableRows(script.content);
        const lastColIdx = parsed[0].length - 1;
        await updateTableCell(script.id, rIdx, lastColIdx, data.updatedBrief);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingBrief(null);
    }
  };

  const handleRegenerate = async (script: any) => {
    setIsRegenerating(script.id);
    try {
      let safeAvatarIdx = script.avatarIdx;
      if (typeof safeAvatarIdx === 'undefined' && project?.avatars) {
        safeAvatarIdx = project.avatars.findIndex((a: any) => a.segmentName === script.avatarName);
      }
      const safeAvatarData = project?.avatars?.[safeAvatarIdx] || project?.avatars?.[0];

      let existingConcepts: string[] = [];
      const relevantScripts = scripts.filter(s => s.avatarName === script.avatarName && s.format === script.format);
      relevantScripts.forEach(s => {
        if (s.content) {
          const lines = s.content.split('\n');
          lines.forEach((line: string) => {
            if (line.trim().startsWith('|') && !line.includes('---|')) {
              const parts = line.split('|').map(p => p.trim());
              if (parts.length > 2 && !isNaN(parseInt(parts[1]))) {
                existingConcepts.push(parts[2]);
              }
            }
          });
        }
      });
      existingConcepts = existingConcepts.slice(0, 20);

      const res = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          productName: script.productName || project?.name || project?.productName || 'Продукт',
          avatarIdx: safeAvatarIdx || 0,
          avatarData: safeAvatarData,
          format: script.format,
          toneOfVoice: script.toneOfVoice || 'Дружелюбный',
          count: 3,
          language: script.language || 'Українська',
          colors: script.colors,
          existingConcepts: existingConcepts.length > 0 ? existingConcepts : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let finalScripts: any[] | null = null;
      setScripts(prevScripts => {
        const updatedScripts = [data.script, ...prevScripts];
        finalScripts = updatedScripts;
        return updatedScripts;
      });
      if (finalScripts) {
        await set(`projectScripts_${id}`, finalScripts);
      }
    } catch (e: any) {
      alert('Ошибка при регенерации: ' + e.message);
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleGenerateVideo = async (script: any) => {
    setIsGeneratingVideo(script.id);
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          scriptId: script.id,
          scriptText: script.content,
          logoUrl: project?.logoUrl,
          logoPosition: project?.logoPosition
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Сохраняем URL видео в скрипт
      let finalScripts: any[] | null = null;
      setScripts(prevScripts => {
        const newScripts = [...prevScripts];
        const scriptIndex = newScripts.findIndex(s => s.id === script.id);
        if (scriptIndex !== -1) {
          newScripts[scriptIndex] = { ...newScripts[scriptIndex], videoUrl: data.videoUrl };
          finalScripts = newScripts;
          return newScripts;
        }
        return prevScripts;
      });

      if (finalScripts) {
        await set(`projectScripts_${id}`, finalScripts);
        if (id && id !== 'temp-id') {
          fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, brief: { ...(project?.brief || {}), scripts: finalScripts } })
          }).catch(console.error);
        }
      }
      
      alert('Видео успешно сгенерировано!');
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при генерации видео: ' + err.message);
    } finally {
      setIsGeneratingVideo(null);
    }
  };

  // Parse markdown table into rows (returns array of cell arrays, skipping separator row)
  
  const handleOpenGenModal = (script: any, rowIdx: number, cells: string[]) => {
    setGenerationModal({
      isOpen: true,
      selectedIds: [{script, rowIdx, cells}],
      quantity: 1,
      useBrandColors: false,
      userNotes: '',
      enhancePrompt: globalEnhancePrompt
    });
  };

  const handleOpenMassGenModal = () => {
    // Find all selected rows
    const selectedData: {script: any, rowIdx: number, cells: string[]}[] = [];
    filteredScripts.forEach(s => {
      const parsed = parseTableRows(s.content);
      parsed.forEach((row, rIdx) => {
        if (selectedRows.includes(`${s.id}_row${rIdx}`)) {
          selectedData.push({ script: s, rowIdx: rIdx, cells: row });
        }
      });
    });
    if (selectedData.length === 0) return;
    setGenerationModal({
      isOpen: true,
      selectedIds: selectedData,
      quantity: 1,
      useBrandColors: false,
      userNotes: '',
      enhancePrompt: globalEnhancePrompt
    });
  };

  const confirmGeneration = async () => {
    if (!generationModal) return;
    setGenerationModal({...generationModal, isOpen: false});
    const { selectedIds, quantity, useBrandColors, userNotes, enhancePrompt } = generationModal;

    for (const item of selectedIds) {
      // Small delay to prevent rate limit
      await new Promise(r => setTimeout(r, 1000));
      
      const finalNotes = (useBrandColors ? "Используй брендовые цвета. " : "") + userNotes;
      const prevNotes = rowNotes[`${item.script.id}_row${item.rowIdx}`] || '';
      
      let finalScriptNotes = finalNotes ? `${prevNotes}\n${finalNotes}`.trim() : prevNotes;
      
      // Inject NO_PEOPLE rule into notes if the script was generated in without_people mode
      if (item.script.peoplePresence === 'without_people') {
         finalScriptNotes = `[NO_PEOPLE]\n${finalScriptNotes}`;
      }

      setGeneratingImages(prev => [...prev, { scriptId: item.script.id, rowIdx: item.rowIdx, action: 'add' }]);
      try {
        const designBrief = item.cells[item.cells.length - 1] || '';
        const scriptText = item.cells.join('\n');
        
        const res = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: id,
            scriptId: `${item.script.id}_row${item.rowIdx}`,
            cells: item.cells,
            scriptText,
            designBrief,
            avatarName: item.script.avatarName,
            productName: item.script.productName || project?.name,
            action: 'add',
            count: quantity,
            userNotes: finalScriptNotes,
            logoUrl: project?.logoUrl,
            logoPosition: project?.logoPosition,
            enhancePrompt,
            resolution: globalImageFormat
          })
        });

        const data = await res.json();
        if (!res.ok) {
          alert('Ошибка для строки: ' + data.error);
          continue;
        }

        setScripts(prevScripts => {
          const newScripts = [...prevScripts];
          const sIdx = newScripts.findIndex(s => s.id === item.script.id);
          if (sIdx !== -1) {
            const targetScript = { ...newScripts[sIdx] };
            const newRowImages = { ...(targetScript.rowImages || {}) };
            const addedUrls = data.urls && data.urls.length > 0 ? data.urls : (data.url ? [data.url] : []);
            newRowImages[item.rowIdx] = [...(newRowImages[item.rowIdx] || []), ...addedUrls];
            
            targetScript.rowImages = newRowImages;
            newScripts[sIdx] = targetScript;
            
            set(`projectScripts_${id}`, newScripts).catch(console.error);
            if (id && id !== 'temp-id') {
              fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, brief: { ...(project?.brief || {}), scripts: newScripts } })
              }).catch(console.error);
            }
            return newScripts;
          }
          return prevScripts;
        });
      } catch (err: any) {
        console.error(err);
      } finally {
        setGeneratingImages(prev => prev.filter(g => !(g.scriptId === item.script.id && g.rowIdx === item.rowIdx && g.action === 'add')));
      }
    }
    setSelectedRows([]); // clear selection
  };

  const parseTableRows = (content: string): string[][] => {
    const cleaned = content
      .replace(/^```(?:markdown|html)?\n?/i, '')
      .replace(/```$/i, '')
      .replace(/\|\s*\|---/g, '|\n|---')
      .trim();
    const lines = cleaned.split('\n').filter(l => l.trim().startsWith('|'));
    return lines
      .filter(l => !l.replace(/\|/g, '').replace(/-/g, '').trim().startsWith('') || l.replace(/[|\-\s]/g, '').length > 0)
      .filter(l => !l.replace(/\|/g, '').replace(/-+/g, '').trim() === false)
      .map(l => {
        return robustParseTableLine(l);
      })
      .filter(row => !row.every(cell => /^-+$/.test(cell.replace(/\s/g, ''))));
  };

  // Generate images for a specific table row
  // rowCells: all cells of the row; last cell is typically the design brief
  const handleGenerateRowImage = async (script: any, rowIdx: number, rowCells: string[], action: 'add' | 'replace' = 'add', imgIdx?: number, genCount: number = 1) => {
    setGeneratingImages(prev => [...prev, { scriptId: script.id, rowIdx, action, imgIdx }]);
    try {
      const rowImages: Record<number, string[]> = script.rowImages || {};
      const oldImageUrl = action === 'replace' && imgIdx !== undefined ? rowImages[rowIdx]?.[imgIdx] : undefined;

      // Use last column as design brief (colors, layout, composition) — safest for image generation
      // Earlier columns contain hook text which may trigger safety filters
      const designBrief = rowCells[rowCells.length - 1] || '';
      const scriptText = rowCells.join('\n');
      
      let userNotes = rowNotes[`${script.id}_row${rowIdx}`] || '';

      // Inject NO_PEOPLE rule into notes if the script was generated in without_people mode
      if (script.peoplePresence === 'without_people') {
         userNotes = `[NO_PEOPLE]\n${userNotes}`;
      }

      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          scriptId: `${script.id}_row${rowIdx}`,
          cells: rowCells,        // Full row: [№, conceptTitle, adCopy, designBrief]
          scriptText,
          designBrief,
          avatarName: script.avatarName,
          productName: script.productName || project?.name,
          action,
          oldImageUrl,
          count: action === 'replace' ? 1 : genCount,
          userNotes,
          enhancePrompt: globalEnhancePrompt,
          resolution: globalImageFormat
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');

      setScripts(prevScripts => {
        const newScripts = [...prevScripts];
        const scriptIndex = newScripts.findIndex(s => s.id === script.id);
        if (scriptIndex !== -1) {
          const targetScript = { ...newScripts[scriptIndex] };
          const newRowImages: Record<number, string[]> = { ...(targetScript.rowImages || {}) };
          const existingRowImgs = [...(newRowImages[rowIdx] || [])];

          if (action === 'add') {
            if (data.urls?.length > 0) existingRowImgs.push(...data.urls);
            else if (data.url) existingRowImgs.push(data.url);
          } else if (action === 'replace' && imgIdx !== undefined) {
            existingRowImgs[imgIdx] = data.urls?.[0] || data.url;
          }

          newRowImages[rowIdx] = existingRowImgs;
          targetScript.rowImages = newRowImages;
          newScripts[scriptIndex] = targetScript;

          set(`projectScripts_${id}`, newScripts).catch(console.error);
          if (id && id !== 'temp-id') {
            fetch('/api/projects', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, brief: { ...(project?.brief || {}), scripts: newScripts } })
            }).catch(console.error);
          }
          return newScripts;
        }
        return prevScripts;
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error generating image');
    } finally {
      setGeneratingImages(prev => prev.filter(g => !(g.scriptId === script.id && g.rowIdx === rowIdx && g.action === action && g.imgIdx === imgIdx)));
    }
  };

  const handleDeleteRowImage = async (script: any, rowIdx: number, imgIdx: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот вариант креатива?')) return;
    try {
      setScripts(prevScripts => {
        const newScripts = [...prevScripts];
        const scriptIndex = newScripts.findIndex(s => s.id === script.id);
        if (scriptIndex !== -1) {
          const targetScript = { ...newScripts[scriptIndex] };
          const newRowImages: Record<number, string[]> = { ...(targetScript.rowImages || {}) };
          const existingRowImgs = [...(newRowImages[rowIdx] || [])];
          
          existingRowImgs.splice(imgIdx, 1);
          newRowImages[rowIdx] = existingRowImgs;
          targetScript.rowImages = newRowImages;
          newScripts[scriptIndex] = targetScript;
          
          set(`projectScripts_${id}`, newScripts).catch(console.error);
          if (id && id !== 'temp-id') {
            fetch('/api/projects', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, brief: { ...(project?.brief || {}), scripts: newScripts } })
            }).catch(console.error);
          }
          return newScripts;
        }
        return prevScripts;
      });
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при удалении картинки: ' + err.message);
    }
  };

  if (!mounted) return null;

  return (
    <div suppressHydrationWarning>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Сценарии креативов</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Управляйте готовыми ТЗ и отправляйте их в продакшен.</p>
        </div>
      </div>

      {scripts.length > 0 && (
        <div className="card shadow-sm mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1.25rem 1.5rem', alignItems: 'center', background: '#fff', borderRadius: '16px' }}>
          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Фильтры:</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Продукт:</label>
            <select
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', color: '#334155', fontWeight: 500, minWidth: '140px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Формат:</label>
            <select
              value={filterFormat}
              onChange={e => setFilterFormat(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', color: '#334155', fontWeight: 500, minWidth: '140px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {formatOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Аватар:</label>
            <select
              value={filterAvatar}
              onChange={e => setFilterAvatar(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', color: '#334155', fontWeight: 500, minWidth: '140px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {avatarOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Формат картинок:</label>
            <select
              value={globalImageFormat}
              onChange={e => setGlobalImageFormat(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', color: '#334155', fontWeight: 600, minWidth: '160px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <option value="1024x1024">Квадрат (1:1)</option>
              <option value="1440x2560">Вертикальное Stories (9:16)</option>
              <option value="1792x2240">Вертикальное Лента (4:5)</option>
              <option value="2560x1440">Горизонтальное (16:9)</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
            <input
              type="checkbox"
              id="globalEnhancePrompt"
              checked={globalEnhancePrompt}
              onChange={(e) => setGlobalEnhancePrompt(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="globalEnhancePrompt" style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 700, cursor: 'pointer' }} title="GPT-4 автоматически улучшит структуру промпта для генерации идеальной рекламной инфографики (как в ChatGPT)">
              ✨ Улучшенное качество (GPT-4)
            </label>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Загружаем сценарии...</h3>
        </div>
      ) : scripts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>У вас пока нет сценариев</h3>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>Сгенерируйте первый пак сценариев на основе аватаров проекта.</p>
          <Link href={`/project/${id}/generate`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Перейти к генерации
          </Link>
        </div>
      ) : filteredScripts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Ничего не найдено</h3>
          <p style={{ color: '#64748b' }}>Попробуйте изменить параметры фильтрации.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredScripts.map((script) => (
            <div key={script.id} className="card shadow-md" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {/* Header */}
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700 }}>
                      Аватар: {script.avatarName}
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.35rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600 }}>
                      Формат: {script.format}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '1rem' }}>
                    <span>Tone of Voice: <b>{script.toneOfVoice.split('→')[0].trim()}</b></span>
                    <span>Язык: <b>{script.language}</b></span>
                    <span>Создано: {new Date(script.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                </div>

                {/* Action buttons — compact style */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {editingScriptId === script.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(script.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700,
                          background: '#4f46e5', color: 'white', border: 'none',
                          borderRadius: '8px', cursor: 'pointer',
                        }}
                      >
                        ✓ Сохранить
                      </button>
                      <button
                        onClick={() => { setEditingScriptId(null); setEditTableData([]); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                          background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                          borderRadius: '8px', cursor: 'pointer',
                        }}
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingScriptId(script.id);
                        const lines = script.content.split('\n');
                        const tableLines = lines.filter((l: string) => l.trim().startsWith('|'));
                        const firstTableIdx = lines.indexOf(tableLines[0]);
                        const lastTableIdx = lines.indexOf(tableLines[tableLines.length - 1]);
                        const before = lines.slice(0, firstTableIdx).join('\n');
                        const after = lines.slice(lastTableIdx + 1).join('\n');
                        const parsedData = tableLines.map((line: string) => {
                          const parts = line.split('|');
                          return parts.slice(1, parts.length - 1).map((p: string) => p.trim());
                        });
                        setEditTableData(parsedData);
                        setEditOtherText({ before, after });
                      }}
                      title="Редактировать"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                        background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
                        borderRadius: '8px', cursor: 'pointer',
                      }}
                    >
                      ✏️ Ред.
                    </button>
                  )}

                  <button
                    onClick={() => handleRegenerate(script)}
                    disabled={isRegenerating === script.id}
                    title="Перегенерировать сценарий"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                      background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
                      borderRadius: '8px', cursor: isRegenerating === script.id ? 'not-allowed' : 'pointer',
                      opacity: isRegenerating === script.id ? 0.6 : 1,
                    }}
                  >
                    {isRegenerating === script.id
                      ? <><Loader2 size={13} className="animate-spin" /> Генерация…</>
                      : '🔄 Перегенерировать'
                    }
                  </button>

                  <button
                    onClick={() => handleCopy(script.id, script.content)}
                    title="Копировать"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                      background: copiedId === script.id ? '#ecfdf5' : '#f8fafc',
                      color: copiedId === script.id ? '#10b981' : '#334155',
                      border: `1px solid ${copiedId === script.id ? '#a7f3d0' : '#e2e8f0'}`,
                      borderRadius: '8px', cursor: 'pointer',
                    }}
                  >
                    {copiedId === script.id ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copiedId === script.id ? 'Скопировано' : 'Копировать'}
                  </button>

                  <button
                    onClick={() => handleDeleteScript(script.id)}
                    title="Удалить"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px',
                      background: '#fff0f0', color: '#ef4444', border: '1px solid #fecaca',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>





              {/* Content + per-row image generation */}
              <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
                {(() => {
                  const tableRows = parseTableRows(script.content);
                  const headerRow = tableRows[0] || [];
                  const dataRows = tableRows.slice(1);
                  const rowImages: Record<number, string[]> = script.rowImages || {};

                  if (editingScriptId === script.id) {
                    return (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="script-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', border: '1px solid #cbd5e1' }}>
                          <tbody>
                            {editTableData.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => {
                                  const isHeaderOrSeparator = rIdx === 0 || rIdx === 1 || cell.includes('---');
                                  if (isHeaderOrSeparator) {
                                    return (
                                      <td key={cIdx} style={{ padding: '1rem', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }}>
                                        {cell}
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={cIdx} style={{ padding: 0, border: '1px solid #cbd5e1', verticalAlign: 'top' }}>
                                      <textarea
                                        value={cell}
                                        onChange={(e) => {
                                          const newData = [...editTableData];
                                          newData[rIdx][cIdx] = e.target.value;
                                          setEditTableData(newData);
                                        }}
                                        style={{ width: '100%', minHeight: '150px', padding: '1rem', border: 'none', resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '0.95rem' }}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (dataRows.length === 0) {
                    // Fallback: render markdown as-is (no table detected)
                    return (
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={remarkPluginsList} rehypePlugins={rehypePluginsList}>
                          {script.content.replace(/^```(?:markdown|html)?\n?/i, '').replace(/```$/i, '').trim()}
                        </ReactMarkdown>
                      </div>
                    );
                  }

                  return (
                    <div>
                      {/* Header row */}
                      <div style={{ display: 'grid', gridTemplateColumns: headerRow.length === 4 ? '40px 60px 1.25fr 2.5fr 3fr' : headerRow.length === 3 ? '40px 1.25fr 2.5fr 3fr' : `40px repeat(${headerRow.length}, 1fr)`, background: '#f8fafc', borderRadius: '10px 10px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
                        {headerRow.map((cell, cIdx) => (
                          
  <React.Fragment key={cIdx}>
  {cIdx === 0 && (
    <div style={{ padding: '0.75rem 1rem', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        onChange={(e) => {
          const rowIds = dataRows.map((_, i) => `${script.id}_row${i}`);
          if (e.target.checked) {
            setSelectedRows(prev => Array.from(new Set([...prev, ...rowIds])));
          } else {
            setSelectedRows(prev => prev.filter(id => !rowIds.includes(id)));
          }
        }}
        checked={dataRows.length > 0 && dataRows.every((_, i) => selectedRows.includes(`${script.id}_row${i}`))}
      />
    </div>
  )}
  <div style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: '#475569', borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>
                            {cell}
                          </div>
                        </React.Fragment>
                        ))}
                      </div>

                      {/* Data rows with per-row image gallery */}
                      {dataRows.map((row, dataRowIdx) => {
                        const thisRowImgs = rowImages[dataRowIdx] || [];
                        const isGenThisRow = generatingImages.some(g => g.scriptId === script.id && g.rowIdx === dataRowIdx);
                        const isGenThisRowAdding = generatingImages.some(g => g.scriptId === script.id && g.rowIdx === dataRowIdx && g.action === 'add');
                        const isAnyGen = generatingImages.length > 0;

                        const isVideoFormat = /відео|видео|video/i.test(script.format || '');
                        console.log('[DEBUG] script.format:', JSON.stringify(script.format), 'isVideoFormat:', isVideoFormat);

                        return (
                          <div key={dataRowIdx} style={{ border: '1px solid #e2e8f0', borderTop: dataRowIdx === 0 ? '1px solid #e2e8f0' : 'none', borderRadius: dataRowIdx === dataRows.length - 1 ? '0 0 10px 10px' : '0', overflow: 'hidden' }}>
                            {/* Per-row generation section */}
                            {isVideoFormat ? (
                              /* ---- VIDEO FORMAT: показываем блок генерации видео только в первой строке ---- */
                              dataRowIdx === 0 ? (
                                <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', borderBottom: '1px solid #312e81' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <span style={{ fontSize: '1.1rem' }}>🎬</span>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc' }}>Видео-Креатив</span>
                                      {script.videoUrl && (
                                        <span style={{ background: '#16a34a', color: 'white', fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 700 }}>✓ Готово</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleGenerateVideo(script)}
                                      disabled={isGeneratingVideo === script.id}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700,
                                        background: isGeneratingVideo === script.id ? '#312e81' : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                                        color: 'white', border: 'none', borderRadius: '8px',
                                        cursor: isGeneratingVideo === script.id ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 15px rgba(79,70,229,0.4)',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {isGeneratingVideo === script.id
                                        ? <><Loader2 size={14} className="animate-spin" /> Рендеринг видео (~1-2 мин)...</>
                                        : <>{script.videoUrl ? '🔄 Перегенерировать видео' : '🎬 Сгенерировать видео'}</>}
                                    </button>
                                  </div>
                                  {script.videoUrl && (
                                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                      <video
                                        src={script.videoUrl}
                                        controls
                                        style={{ width: '200px', borderRadius: '10px', border: '2px solid #4f46e5', backgroundColor: '#000' }}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                                        <a href={script.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: '#a5b4fc', textDecoration: 'none', fontWeight: 600 }}>🔗 Открыть в новой вкладке</a>
                                        <a href={script.videoUrl} download style={{ fontSize: '0.82rem', color: '#6ee7b7', textDecoration: 'none', fontWeight: 600 }}>📥 Скачать MP4</a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null
                            ) : (
                            <div style={{ padding: '1.25rem', background: '#f5f3ff', borderBottom: '1px dashed #c7d2fe' }}>
                              
                              {/* Custom prompt/notes input */}
                              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', minWidth: '110px' }}>
                                  Уточнения для ИИ:
                                </span>
                                <input
                                  type="text"
                                  placeholder="Например: светлый фон, минималистичный фон, текст слева, крупный план..."
                                  value={rowNotes[`${script.id}_row${dataRowIdx}`] || ''}
                                  onChange={(e) => setRowNotes(prev => ({
                                    ...prev,
                                    [`${script.id}_row${dataRowIdx}`]: e.target.value
                                  }))}
                                  disabled={isGenThisRow}
                                  style={{
                                    flex: 1,
                                    fontSize: '0.78rem',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid #c7d2fe',
                                    outline: 'none',
                                    background: 'white',
                                    color: '#1e293b',
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: thisRowImgs.length > 0 ? '0.75rem' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <ImageIcon size={15} style={{ color: '#6366f1' }} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4338ca' }}>
                                    Визуалы концепции #{dataRowIdx + 1}
                                  </span>
                                  {thisRowImgs.length > 0 && (
                                    <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '99px', fontWeight: 700 }}>
                                      {thisRowImgs.length} шт.
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  {/* Generate images button */}
                                  <button
                                    onClick={() => handleGenerateRowImage(script, dataRowIdx, row, 'add', undefined, 1)}
                                    disabled={isGenThisRow}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                                      background: isGenThisRow ? '#4338ca' : '#6366f1',
                                      color: 'white', border: 'none', borderRadius: '8px',
                                      padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700,
                                      cursor: isGenThisRow ? 'not-allowed' : 'pointer',
                                      opacity: isGenThisRow && !isGenThisRowAdding ? 0.5 : 1,
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {isGenThisRowAdding ? (
                                      <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}><Loader2 size={13} /></span> Генерирую…</>
                                    ) : (
                                      <><ImageIcon size={13} /> Генерировать креатив</>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {thisRowImgs.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                  {thisRowImgs.map((imgData: any, imgIdx: number) => {
                                    const finalImageUrl = typeof imgData === 'string' ? imgData : (imgData?.previewUrl || imgData?.backgroundUrl || imgData?.background?.imageUrl || '');
                                    return (
                                      <CreativeCard
                                        key={imgIdx}
                                        index={imgIdx + 1}
                                        imageUrl={finalImageUrl}
                                        overlay={extractOverlay(row)}
                                      isReplacing={generatingImages.some(g => g.scriptId === script.id && g.rowIdx === dataRowIdx && g.action === 'replace' && g.imgIdx === imgIdx)}
                                      disabled={isGenThisRow}
                                      onReplace={() => {
                                        if (window.confirm('Перегенерировать это изображение? Текущий вариант будет заменен.')) {
                                          handleGenerateRowImage(script, dataRowIdx, row, 'replace', imgIdx);
                                        }
                                      }}
                                      onDelete={() => handleDeleteRowImage(script, dataRowIdx, imgIdx)}
                                      onEdit={() => {
                                        const layoutData = typeof imgData === 'object' && imgData.layoutData ? imgData.layoutData : null;
                                        setEditingLayout({ scriptId: script.id, rowIdx: dataRowIdx, imgIdx, layoutData: layoutData || imgData });
                                      }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            )}

                            {/* Row cells (rendered below) */}
                            <div style={{ display: 'grid', gridTemplateColumns: headerRow.length === 4 ? '40px 60px 1.25fr 2.5fr 3fr' : headerRow.length === 3 ? '40px 1.25fr 2.5fr 3fr' : `40px repeat(${headerRow.length}, 1fr)`, background: dataRowIdx % 2 === 0 ? 'white' : '#fafbff' }}>
                              {row.map((cell, cIdx) => {
                                const isTextCol = headerRow.length === 4 && cIdx === 2;
                                const isBriefCol = headerRow.length === 4 && cIdx === 3;
                                const isUpdatingThisBrief = isUpdatingBrief === `${script.id}_row${dataRowIdx}` && isBriefCol;
                                
                                return (
                                  <React.Fragment key={cIdx}>
                                  {cIdx === 0 && (
                                    <div style={{ padding: '1rem', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                      <input type="checkbox" style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '4px' }}
                                        checked={selectedRows.includes(`${script.id}_row${dataRowIdx}`)}
                                        onChange={(e) => {
                                          const id = `${script.id}_row${dataRowIdx}`;
                                          if (e.target.checked) setSelectedRows(prev => [...prev, id]);
                                          else setSelectedRows(prev => prev.filter(r => r !== id));
                                        }}
                                      />
                                    </div>
                                  )}
                                    <div 
                                      onClick={() => {
                                        if (!activeEditCell && (isTextCol || isBriefCol)) {
                                          setActiveEditCell(`${script.id}_${dataRowIdx}_${cIdx}`);
                                        }
                                      }}
                                      style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', wordBreak: 'break-word', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left', position: 'relative', cursor: (isTextCol || isBriefCol) && activeEditCell !== `${script.id}_${dataRowIdx}_${cIdx}` ? 'pointer' : 'default' }}
                                      title={(isTextCol || isBriefCol) && activeEditCell !== `${script.id}_${dataRowIdx}_${cIdx}` ? 'Кликните, чтобы редактировать' : ''}
                                    >
                                      {isUpdatingThisBrief && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#4338ca', fontWeight: 600 }}>
                                            <Loader2 size={24} className="animate-spin" />
                                            <span>Обновление ТЗ ИИ...</span>
                                          </div>
                                        </div>
                                      )}
                                      {activeEditCell === `${script.id}_${dataRowIdx}_${cIdx}` ? (
                                        <textarea
                                          autoFocus
                                          defaultValue={cell.replace(/<br\s*\/?>/gi, '\n')}
                                          onBlur={(e) => {
                                            setActiveEditCell(null);
                                            const newText = e.target.value;
                                            const oldText = cell.replace(/<br\s*\/?>/gi, '\n');
                                            
                                            if (newText !== oldText) {
                                              updateTableCell(script.id, dataRowIdx, cIdx, newText);
                                              
                                              // Smart Bidirectional Sync
                                              // Find what was changed
                                              let start = 0;
                                              while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) start++;
                                              let endOld = oldText.length - 1;
                                              let endNew = newText.length - 1;
                                              while (endOld >= start && endNew >= start && oldText[endOld] === newText[endNew]) {
                                                endOld--;
                                                endNew--;
                                              }
                                              const removed = oldText.substring(start, endOld + 1);
                                              const added = newText.substring(start, endNew + 1);
                                              
                                              // If the removed snippet is significant (>= 3 chars or is a word)
                                              if (removed.trim().length >= 2) {
                                                const otherColIdx = isTextCol ? 3 : 2;
                                                const otherText = row[otherColIdx];
                                                if (otherText && otherText.includes(removed)) {
                                                  // Apply the same replacement to the other column
                                                  const updatedOtherText = otherText.replace(removed, added);
                                                  updateTableCell(script.id, dataRowIdx, otherColIdx, updatedOtherText);
                                                } else if (isTextCol) {
                                                  // Fallback to AI update if it's the Text column and we couldn't find an exact match to replace
                                                  handleBriefAIUpdate(script, dataRowIdx, newText, row[3]);
                                                }
                                              } else if (isTextCol) {
                                                // If the change was too small to auto-sync safely, fallback to AI update
                                                handleBriefAIUpdate(script, dataRowIdx, newText, row[3]);
                                              }
                                            }
                                          }}
                                          style={{ flex: 1, width: '100%', minHeight: '180px', padding: '0.5rem', border: '2px solid #6366f1', borderRadius: '6px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', background: '#fff', boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)' }}
                                        />
                                      ) : (
                                        <div className="markdown-content" style={{ opacity: isUpdatingThisBrief ? 0.3 : 1, flex: 1 }}>
                                          <ReactMarkdown remarkPlugins={remarkPluginsList} rehypePlugins={rehypePluginsList}>
                                            {cell}
                                          </ReactMarkdown>
                                          {(isTextCol || isBriefCol) && (
                                            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', color: '#64748b', opacity: 0.7, pointerEvents: 'none' }}>
                                              ✏️ Кликните для ред.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

          ))}
        </div>
      )}

      
      {/* Floating Action Bar */}
      {selectedRows.length > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: 'white', padding: '1rem 2rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 50 }}>
          <span style={{ fontWeight: 600 }}>Выбрано креативов: {selectedRows.length}</span>
          <button onClick={handleOpenMassGenModal} style={{ background: '#3b82f6', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '99px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={18} />
            Сгенерировать выбранные
          </button>
        </div>
      )}

      {/* Generation Modal */}
      {generationModal?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '500px', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1e293b' }}>
              Настройки генерации ({generationModal.selectedIds.length} шт.)
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Количество вариантов (каждого)</label>
                <span style={{ fontWeight: 800, color: '#3b82f6' }}>{generationModal.quantity}</span>
              </div>
              <input 
                type="range" min="1" max="4" 
                value={generationModal.quantity} 
                onChange={e => setGenerationModal({...generationModal, quantity: parseInt(e.target.value)})}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                <input 
                  type="checkbox" 
                  checked={generationModal.useBrandColors}
                  onChange={e => setGenerationModal({...generationModal, useBrandColors: e.target.checked})}
                />
                Использовать брендовые цвета (из параметров)
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                <input 
                  type="checkbox" 
                  checked={generationModal.enhancePrompt}
                  onChange={e => setGenerationModal({...generationModal, enhancePrompt: e.target.checked})}
                />
                ✨ Улучшенное качество картинки (GPT-4)
              </label>
              <p style={{ margin: '0.2rem 0 0 1.7rem', fontSize: '0.8rem', color: '#64748b' }}>
                GPT-4 автоматически перепишет ТЗ в идеальный промпт для DALL-E 3 (инфографика, UI-элементы).
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                Уточнения для ИИ (опционально)
              </label>
              <textarea 
                placeholder="Например: светлый фон, минималистичный стиль, фотореализм..."
                value={generationModal.userNotes}
                onChange={e => setGenerationModal({...generationModal, userNotes: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '80px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setGenerationModal(null)}
                style={{ padding: '0.75rem 1.5rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button 
                onClick={confirmGeneration}
                style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ImageIcon size={18} />
                Начать генерацию
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.95rem;
          color: #334155;
        }
        .markdown-content th {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 1rem;
          text-align: left;
          font-weight: 700;
          color: #1e293b;
        }
        .markdown-content td {
          border: 1px solid #e2e8f0;
          padding: 1rem;
          vertical-align: top;
          word-break: break-word;
        }
        .markdown-content tr:nth-child(even) {
          background-color: #fbfbfb;
        }
        .markdown-content br {
          content: "";
          display: block;
          margin-bottom: 0.5rem;
        }
        .markdown-content ul, .markdown-content ol {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
        }
        .markdown-content li {
          margin-bottom: 0.25rem;
        }
        .markdown-content strong {
          color: #0f172a;
          font-weight: 700;
        }
        .markdown-content p {
          margin: 0 0 0.5rem 0;
          line-height: 1.6;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
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
              setScripts(newScripts);
              await set(`projectScripts_${id}`, newScripts);
            }
            setEditingLayout(null);
          }}
        />
      )}
    </div>
  );
}
