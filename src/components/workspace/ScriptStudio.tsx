'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Copy, CheckCircle2, ArrowLeft, Plus, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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
  const [isGeneratingImage, setIsGeneratingImage] = useState<{ scriptId: string, action: 'add' | 'replace', index?: number } | null>(null);

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

  const handleGenerateImage = async (script: any, action: 'add' | 'replace' = 'add', index?: number) => {
    setIsGeneratingImage({ scriptId: script.id, action, index });
    try {
      const oldImageUrl = action === 'replace' && index !== undefined ? script.images?.[index] : undefined;

      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          scriptId: script.id,
          scriptText: script.content,
          avatarName: script.avatarName,
          productName: script.productName || project?.name,
          action,
          oldImageUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate image');

      // Update script with new image
      const newScripts = [...scripts];
      const scriptIndex = newScripts.findIndex(s => s.id === script.id);
      
      if (scriptIndex !== -1) {
        const targetScript = newScripts[scriptIndex];
        const images = [...(targetScript.images || [])];
        
        if (action === 'add') {
          images.push(data.url);
        } else if (action === 'replace' && index !== undefined) {
          images[index] = data.url;
        }

        targetScript.images = images;
        setScripts(newScripts);
        localStorage.setItem(`projectScripts_${id}`, JSON.stringify(newScripts));

        // Save to DB if possible
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

  if (!mounted) return null;

  return (
    <div suppressHydrationWarning>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Сценарии креативов</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Управляйте готовыми ТЗ и отправляйте их в продакшен.</p>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn btn-primary shadow-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', borderRadius: '12px', padding: '0.75rem 1.25rem' }}
        >
          <Plus size={18} />
          Сгенерировать еще
        </button>
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

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {editingScriptId === script.id ? (
                    <button
                      onClick={() => handleSaveEdit(script.id)}
                      className="btn btn-primary shadow-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px' }}
                    >
                      Сохранить
                    </button>
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
                      className="btn btn-secondary shadow-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', background: 'white' }}
                    >
                      🖊️ Редактировать
                    </button>
                  )}
                  <button
                    onClick={() => handleRegenerate(script)}
                    disabled={isRegenerating === script.id}
                    className="btn btn-secondary shadow-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', background: 'white' }}
                  >
                    {isRegenerating === script.id ? <Loader2 size={16} className="animate-spin" /> : '🔄'}
                    {isRegenerating === script.id ? 'Генерация...' : 'Перегенерировать'}
                  </button>
                  <Link
                    href={`/project/${id}/studio/${script.id}`}
                    className="btn btn-primary shadow-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', borderRadius: '10px' }}
                  >
                    🎨 Мастерская
                  </Link>
                  <button
                    onClick={() => handleCopy(script.id, script.content)}
                    className="btn btn-secondary shadow-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', background: 'white' }}
                  >
                    {copiedId === script.id ? <CheckCircle2 size={18} color="#10b981" /> : <Copy size={18} />}
                    {copiedId === script.id ? 'Скопировано!' : 'Копировать'}
                  </button>
                  <button
                    onClick={() => handleDeleteScript(script.id)}
                    className="btn btn-secondary shadow-sm hover-red"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', borderRadius: '10px', background: 'white' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Image Gallery */}
              <div style={{ padding: '1.5rem', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                    <ImageIcon size={20} className="text-primary" /> Визуалы (DALL-E 3)
                  </h4>
                  <button
                    onClick={() => handleGenerateImage(script, 'add')}
                    disabled={isGeneratingImage?.scriptId === script.id && isGeneratingImage?.action === 'add'}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    {isGeneratingImage?.scriptId === script.id && isGeneratingImage?.action === 'add' ? (
                      <><span className="spin-wrapper" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}><Loader2 size={16} /></span> Генерируем...</>
                    ) : (
                      <><Plus size={16} /> Сгенерировать картинку ($0.04)</>
                    )}
                  </button>
                </div>
                
                {script.images && script.images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {script.images.map((imgUrl: string, imgIdx: number) => (
                      <div key={imgIdx} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', aspectRatio: '1/1' }}>
                        <img src={imgUrl} alt={`Визуал ${imgIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s', gap: '0.5rem' }} 
                             onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                             onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                        >
                          <a href={imgUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.5rem', borderRadius: '8px' }}>🔍</a>
                          <button 
                            onClick={() => handleGenerateImage(script, 'replace', imgIdx)}
                            disabled={isGeneratingImage?.scriptId === script.id && isGeneratingImage?.index === imgIdx}
                            className="btn btn-secondary" 
                            style={{ padding: '0.5rem', borderRadius: '8px', border: 'none' }}
                          >
                            {isGeneratingImage?.scriptId === script.id && isGeneratingImage?.index === imgIdx ? (
                              <span className="spin-wrapper" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}><Loader2 size={18} /></span>
                            ) : (
                              <RefreshCw size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Нет сгенерированных визуалов для этого сценария.</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Нажмите кнопку выше, чтобы создать уникальную картинку через DALL-E 3.</p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="markdown-content" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                {editingScriptId === script.id ? (
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
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {script.content
                      .replace(/^```(?:markdown|html)?\n?/i, '')
                      .replace(/```$/i, '')
                      .replace(/\|\s*\|---/g, '|\n|---') // Fix if AI outputs header and separator on the same line
                      .trim()}
                  </ReactMarkdown>
                )}
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
