'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Copy, CheckCircle2, ArrowLeft, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function ScriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [scripts, setScripts] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editTableData, setEditTableData] = useState<string[][]>([]);
  const [editOtherText, setEditOtherText] = useState<{ before: string, after: string }>({ before: '', after: '' });
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const [filterFormat, setFilterFormat] = useState<string>('Все');
  const [filterProduct, setFilterProduct] = useState<string>('Все');

  const formatOptions = ['Все', ...Array.from(new Set(scripts.map(s => s.format).filter(Boolean)))];
  const productOptions = ['Все', ...Array.from(new Set(scripts.map(s => s.productName || project?.name || project?.productName || 'Неизвестно').filter(Boolean)))];

  const filteredScripts = scripts.filter(s => {
    if (filterFormat !== 'Все' && s.format !== filterFormat) return false;
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

  return (
    <div suppressHydrationWarning>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
        <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Проекты</Link>
        <span>/</span>
        <Link href={`/project/${id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
          {project?.name || project?.productName || 'Проект'}
        </Link>
        <span>/</span>
        <span style={{ color: '#1e293b' }}>Сценарии креативов</span>
      </div>

      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Сценарии креативов</h1>
          <p className="page-subtitle">Сгенерированные ТЗ и сценарии для передачи в продакшен.</p>
        </div>
        <Link
          href={`/project/${id}/generate`}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <Plus size={18} />
          Сгенерировать еще
        </Link>
      </div>

      {scripts.length > 0 && (
        <div className="card mb-8" style={{ display: 'flex', gap: '1.5rem', padding: '1rem 1.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Фильтры:</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Продукт:</label>
            <select
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
            >
              {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Формат:</label>
            <select
              value={filterFormat}
              onChange={e => setFilterFormat(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
            >
              {formatOptions.map(f => <option key={f} value={f}>{f}</option>)}
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
            <div key={script.id} className="card" style={{ padding: '0' }}>
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700 }}>
                      Аватар: {script.avatarName}
                    </span>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Формат: {script.format}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '1rem' }}>
                    <span>Tone of Voice: <b>{script.toneOfVoice.split('→')[0].trim()}</b></span>
                    <span>Язык: <b>{script.language}</b></span>
                    <span>Создано: {new Date(script.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {editingScriptId === script.id ? (
                    <button
                      onClick={() => handleSaveEdit(script.id)}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      🖊️ Редактировать
                    </button>
                  )}
                  <button
                    onClick={() => handleRegenerate(script)}
                    disabled={isRegenerating === script.id}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {isRegenerating === script.id ? 'Генерация...' : '🔄 Перегенерировать'}
                  </button>
                  <Link
                    href={`/project/${id}/studio/${script.id}`}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  >
                    🎨 Мастерская
                  </Link>
                  <button
                    onClick={() => handleCopy(script.id, script.content)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {copiedId === script.id ? <CheckCircle2 size={18} color="#10b981" /> : <Copy size={18} />}
                    {copiedId === script.id ? 'Скопировано!' : 'Копировать'}
                  </button>
                  <button
                    onClick={() => handleDeleteScript(script.id)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}
                  >
                    🗑️
                  </button>
                </div>
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
