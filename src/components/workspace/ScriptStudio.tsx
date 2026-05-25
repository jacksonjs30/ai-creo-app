'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Copy, CheckCircle2, ArrowLeft, Plus, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CreativeCard, extractOverlay } from './CreativeCard';

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
  const [isGeneratingImage, setIsGeneratingImage] = useState<{ scriptId: string, rowIdx: number, action: 'add' | 'replace', imgIdx?: number } | null>(null);
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({});

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

      // Load scripts from LocalStorage
      const scriptsKey = `projectScripts_${id}`;
      const savedScripts = JSON.parse(localStorage.getItem(scriptsKey) || '[]');
      
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
      // Update LocalStorage with merged data to keep it in sync
      if (mergedScripts.length > 0) {
        localStorage.setItem(scriptsKey, JSON.stringify(mergedScripts));
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

  const handleDeleteScript = (scriptId: string) => {
    if (!window.confirm('Удалить этот пак сценариев?')) return;
    const updatedScripts = scripts.filter(s => s.id !== scriptId);
    setScripts(updatedScripts);
    localStorage.setItem(`projectScripts_${id}`, JSON.stringify(updatedScripts));
  };

  const handleSaveEdit = (scriptId: string) => {
    const tableStr = editTableData.map(row => `| ${row.join(' | ')} |`).join('\n');
    const newContent = `${editOtherText.before}\n${tableStr}\n${editOtherText.after}`.trim();

    const updatedScripts = scripts.map(s => {
      if (s.id === scriptId) {
        return { ...s, content: newContent };
      }
      return s;
    });
    setScripts(updatedScripts);
    localStorage.setItem(`projectScripts_${id}`, JSON.stringify(updatedScripts));
    setEditingScriptId(null);
  };

  const handleRegenerate = async (script: any) => {
    setIsRegenerating(script.id);
    try {
      let safeAvatarIdx = script.avatarIdx;
      if (typeof safeAvatarIdx === 'undefined' && project?.avatars) {
        safeAvatarIdx = project.avatars.findIndex((a: any) => a.segmentName === script.avatarName);
      }
      const safeAvatarData = project?.avatars?.[safeAvatarIdx] || project?.avatars?.[0];

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
          colors: script.colors
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updatedScripts = [data.script, ...scripts];
      setScripts(updatedScripts);
      localStorage.setItem(`projectScripts_${id}`, JSON.stringify(updatedScripts));
    } catch (e: any) {
      alert('Ошибка при регенерации: ' + e.message);
    } finally {
      setIsRegenerating(null);
    }
  };

  // Parse markdown table into rows (returns array of cell arrays, skipping separator row)
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
        const parts = l.split('|');
        return parts.slice(1, parts.length - 1).map(p => p.trim());
      })
      .filter(row => !row.every(cell => /^-+$/.test(cell.replace(/\s/g, ''))));
  };

  // Generate images for a specific table row
  // rowCells: all cells of the row; last cell is typically the design brief
  const handleGenerateRowImage = async (script: any, rowIdx: number, rowCells: string[], action: 'add' | 'replace' = 'add', imgIdx?: number, genCount: number = 1) => {
    setIsGeneratingImage({ scriptId: script.id, rowIdx, action, imgIdx });
    try {
      const rowImages: Record<number, string[]> = script.rowImages || {};
      const oldImageUrl = action === 'replace' && imgIdx !== undefined ? rowImages[rowIdx]?.[imgIdx] : undefined;

      // Use last column as design brief (colors, layout, composition) — safest for image generation
      // Earlier columns contain hook text which may trigger safety filters
      const designBrief = rowCells[rowCells.length - 1] || '';
      const scriptText = rowCells.join('\n');
      
      const userNotes = rowNotes[`${script.id}_row${rowIdx}`] || '';

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
          userNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');

      const newScripts = [...scripts];
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
        setScripts(newScripts);
        localStorage.setItem(`projectScripts_${id}`, JSON.stringify(newScripts));

        if (id && id !== 'temp-id') {
          fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, scripts: newScripts })
          }).catch(console.error);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при генерации картинки: ' + err.message);
    } finally {
      setIsGeneratingImage(null);
    }
  };

  const handleDeleteRowImage = async (script: any, rowIdx: number, imgIdx: number) => {
    if (!confirm('Видалити цей варіант креативу?')) return;
    try {
      const newScripts = [...scripts];
      const scriptIndex = newScripts.findIndex(s => s.id === script.id);
      if (scriptIndex !== -1) {
        const targetScript = { ...newScripts[scriptIndex] };
        const newRowImages: Record<number, string[]> = { ...(targetScript.rowImages || {}) };
        const existingRowImgs = [...(newRowImages[rowIdx] || [])];
        
        existingRowImgs.splice(imgIdx, 1);
        newRowImages[rowIdx] = existingRowImgs;
        targetScript.rowImages = newRowImages;
        newScripts[scriptIndex] = targetScript;
        setScripts(newScripts);
        localStorage.setItem(`projectScripts_${id}`, JSON.stringify(newScripts));

        if (id && id !== 'temp-id') {
          fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, scripts: newScripts })
          }).catch(console.error);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Помилка при видаленні картинки: ' + err.message);
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {script.content.replace(/^```(?:markdown|html)?\n?/i, '').replace(/```$/i, '').trim()}
                        </ReactMarkdown>
                      </div>
                    );
                  }

                  return (
                    <div>
                      {/* Header row */}
                      <div style={{ display: 'grid', gridTemplateColumns: headerRow.length === 4 ? '60px 1.25fr 2fr 3.5fr' : headerRow.length === 3 ? '1.25fr 2fr 3.5fr' : `repeat(${headerRow.length}, 1fr)`, background: '#f8fafc', borderRadius: '10px 10px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
                        {headerRow.map((cell, cIdx) => (
                          <div key={cIdx} style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem', color: '#475569', borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>
                            {cell}
                          </div>
                        ))}
                      </div>

                      {/* Data rows with per-row image gallery */}
                      {dataRows.map((row, dataRowIdx) => {
                        const thisRowImgs = rowImages[dataRowIdx] || [];
                        const isGenThisRow = isGeneratingImage?.scriptId === script.id && isGeneratingImage?.rowIdx === dataRowIdx;
                        const isAnyGen = isGeneratingImage !== null;

                        return (
                          <div key={dataRowIdx} style={{ border: '1px solid #e2e8f0', borderTop: dataRowIdx === 0 ? '1px solid #e2e8f0' : 'none', borderRadius: dataRowIdx === dataRows.length - 1 ? '0 0 10px 10px' : '0', overflow: 'hidden' }}>
                            {/* Per-row image section (rendered above) */}
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
                                  disabled={isAnyGen}
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
                                  {/* Generate 1 image — primary button, cheap */}
                                  <button
                                    onClick={() => handleGenerateRowImage(script, dataRowIdx, row, 'add', undefined, 1)}
                                    disabled={isAnyGen}
                                    title="~$0.04 за 1 зображення (medium quality)"
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                                      background: isGenThisRow ? '#4338ca' : '#6366f1',
                                      color: 'white', border: 'none', borderRadius: '8px',
                                      padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700,
                                      cursor: isAnyGen ? 'not-allowed' : 'pointer',
                                      opacity: isAnyGen && !isGenThisRow ? 0.5 : 1,
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {isGenThisRow && isGeneratingImage?.action === 'add' ? (
                                      <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}><Loader2 size={13} /></span> Генерирую…</>
                                    ) : (
                                      <><Plus size={13} /> {thisRowImgs.length > 0 ? '+ 1 вариант' : 'Сгенерировать (~$0.04)'}</>
                                    )}
                                  </button>
                                  {/* Generate 3 images — secondary, more expensive */}
                                  {!isGenThisRow && (
                                    <button
                                      onClick={() => handleGenerateRowImage(script, dataRowIdx, row, 'add', undefined, 3)}
                                      disabled={isAnyGen}
                                      title="~$0.12 за 3 зображення (medium quality)"
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                        background: 'transparent', border: '1px solid #a5b4fc',
                                        color: '#6366f1', borderRadius: '8px',
                                        padding: '0.4rem 0.75rem', fontSize: '0.72rem', fontWeight: 600,
                                        cursor: isAnyGen ? 'not-allowed' : 'pointer',
                                        opacity: isAnyGen ? 0.4 : 1,
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <Plus size={12} /> 3 варианта (~$0.12)
                                    </button>
                                  )}
                                </div>
                              </div>

                              {thisRowImgs.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                  {thisRowImgs.map((imgUrl: string, imgIdx: number) => (
                                    <CreativeCard
                                      key={imgIdx}
                                      index={imgIdx + 1}
                                      imageUrl={imgUrl}
                                      overlay={extractOverlay(row)}
                                      isReplacing={isGenThisRow && isGeneratingImage?.imgIdx === imgIdx}
                                      disabled={isAnyGen}
                                      onReplace={() => handleGenerateRowImage(script, dataRowIdx, row, 'replace', imgIdx)}
                                      onDelete={() => handleDeleteRowImage(script, dataRowIdx, imgIdx)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Row cells (rendered below) */}
                            <div style={{ display: 'grid', gridTemplateColumns: headerRow.length === 4 ? '60px 1.25fr 2fr 3.5fr' : headerRow.length === 3 ? '1.25fr 2fr 3.5fr' : `repeat(${headerRow.length}, 1fr)`, background: dataRowIdx % 2 === 0 ? 'white' : '#fafbff' }}>
                              {row.map((cell, cIdx) => (
                                <div key={cIdx} style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, borderRight: cIdx < headerRow.length - 1 ? '1px solid #e2e8f0' : 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: (headerRow.length === 4 && cIdx === 0) ? 'center' : 'left' }}>
                                  {cell}
                                </div>
                              ))}
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
    </div>
  );
}
