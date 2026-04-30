'use client';

import {
  ArrowLeft, Brain, Target, ShieldAlert, Heart, MessageSquare,
  Footprints, Flame, AlertCircle, CheckCircle2, Star, Plus, RefreshCw, Trash2, Loader2,
  Edit3, GripVertical
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function AvatarPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [allAvatars, setAllAvatars] = useState<any[]>([]);
  const [avatar, setAvatar] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ section: string, idx: number, data: any } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ section: string, idx: number } | null>(null);

  const allAvatarsRef = useRef<any[]>([]);

  useEffect(() => { loadProjectData(); }, [params.id, params.avatarId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      const projectId = params.id as string;
      const avatarIdx = parseInt(params.avatarId as string);

      let currentAvatars: any[] = [];
      let currentProject: any = null;

      if (projectId && projectId !== 'temp-id') {
        const res = await fetch(`/api/projects?id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const raw = data.project || data.product || data;
          currentProject = { ...raw, brief: raw.brief || raw.product_info || raw.details || {} };
          currentAvatars = raw.avatars || raw.segments || [];
        }
      }

      const localKey = `tempAvatars_${projectId}`;
      const local = localStorage.getItem(localKey) || localStorage.getItem('tempGeneratedAvatars');
      if (local && (currentAvatars.length === 0 || projectId === 'temp-id')) {
        currentAvatars = JSON.parse(local);
      }

      const localBrief = localStorage.getItem(`tempBrief_${projectId}`) || localStorage.getItem('tempBrief');
      if (localBrief && !currentProject) {
        currentProject = { brief: JSON.parse(localBrief) };
      }

      allAvatarsRef.current = currentAvatars;
      setAllAvatars(currentAvatars);
      setProject(currentProject);
      if (currentAvatars[avatarIdx]) setAvatar(currentAvatars[avatarIdx]);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const syncToDB = async (avatarsList: any[]) => {
    const projectId = params.id as string;
    localStorage.setItem(`tempAvatars_${projectId}`, JSON.stringify(avatarsList));
    if (projectId && projectId !== 'temp-id') {
      try {
        await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: projectId, avatars: avatarsList })
        });
      } catch (e) { console.error(e); }
    }
  };

  const saveUpdatedAvatar = (updated: any) => {
    const avatarIdx = parseInt(params.avatarId as string);
    const newAvatars = [...allAvatarsRef.current];
    newAvatars[avatarIdx] = updated;
    allAvatarsRef.current = newAvatars;
    setAllAvatars(newAvatars);
    setAvatar(updated);
    syncToDB(newAvatars);
  };

  const onDragStart = (section: string, idx: number) => setDraggedItem({ section, idx });
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (section: string, targetIdx: number) => {
    if (!draggedItem || draggedItem.section !== section) return;
    const updated = { ...avatar };
    const items = section === 'outcomes' ? [...(updated.outcomes?.items || [])] : [...(updated[section] || [])];
    const [moved] = items.splice(draggedItem.idx, 1);
    items.splice(targetIdx, 0, moved);
    if (section === 'outcomes') updated.outcomes.items = items; else updated[section] = items;
    saveUpdatedAvatar(updated);
    setDraggedItem(null);
  };

  const handleManualAdd = (section: string) => {
    const updated = { ...avatar };
    let newItem: any = { context: "Новый элемент...", frequency_rating: 5 };
    if (section === 'jtbd') newItem.job = "Задача";
    if (section === 'pains') newItem.pain = "Боль";
    if (section === 'fears') newItem.fear = "Страх";
    if (section === 'symptoms') newItem.symptom = "Симптом";
    if (section === 'behaviorMarkers') newItem.marker = "Marker";
    if (section === 'motivations') newItem.motivation = "Мотивация";
    if (section === 'objections') { newItem.objection = "Сомнение"; newItem.howToRemove = "Решение"; }
    if (section === 'cjm') newItem = { title: "Сценарий", scenario: "1. Первый шаг..." };

    if (section === 'outcomes') {
      if (!updated.outcomes) updated.outcomes = { items: [] };
      if (!updated.outcomes.items) updated.outcomes.items = [];
      updated.outcomes.items.push({ outcome: "Результат", explanation: "Детали..." });
    } else {
      if (!updated[section]) updated[section] = [];
      updated[section].push(newItem);
    }
    saveUpdatedAvatar(updated);
    const list = section === 'outcomes' ? updated.outcomes.items : updated[section];
    setEditingItem({ section, idx: list.length - 1, data: list[list.length - 1] });
  };

  const handleDeleteItem = (section: string, idx: number) => {
    if (!confirm('Удалить?')) return;
    const updated = { ...avatar };
    if (section === 'outcomes') updated.outcomes.items = updated.outcomes.items.filter((_: any, i: number) => i !== idx);
    else updated[section] = updated[section].filter((_: any, i: number) => i !== idx);
    saveUpdatedAvatar(updated);
  };

  const handleAction = async (action: 'add' | 'replace', sectionKey: string, itemIdx?: number) => {
    if (workingKey || !avatar) return;
    setWorkingKey(`${sectionKey}-${itemIdx ?? 'new'}`);
    try {
      const existingItems = sectionKey === 'outcomes' ? (avatar.outcomes?.items || []) : (avatar[sectionKey] || []);
      const res = await fetch('/api/avatar/regenerate-item', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sectionKey, existingItems, segmentName: avatar.segmentName, briefContext: project?.brief || {} })
      });
      const data = await res.json();
      if (res.ok && data.item) {
        const updated = JSON.parse(JSON.stringify(avatar));
        if (sectionKey === 'outcomes') {
          if (!updated.outcomes) updated.outcomes = { items: [] };
          if (!updated.outcomes.items) updated.outcomes.items = [];
          if (action === 'add') updated.outcomes.items.push(data.item);
          else updated.outcomes.items[itemIdx!] = data.item;
        } else {
          if (!updated[sectionKey]) updated[sectionKey] = [];
          if (action === 'add') updated[sectionKey].push(data.item);
          else updated[sectionKey][itemIdx!] = data.item;
        }
        saveUpdatedAvatar(updated);
      } else { alert(`Ошибка: ${data.error || 'ИИ не ответил'}`); }
    } catch (err) { console.error(err); } finally { setWorkingKey(null); }
  };

  return (
    <div className="avatar-page-main">
      <style jsx>{`
        .avatar-page-main { maxWidth: 940px; margin: 0 auto; padding: 0 1rem 8rem; }
        .card { background: white; padding: 2.5rem; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .item-mini-card { position: relative; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 12px; background: white; transition: all 0.2s; }
        .item-ctrls { position: absolute; top: 0.75rem; right: 0.75rem; display: flex; gap: 4px; z-index: 10; }
        .item-ctrls button, .drag-hnd { background: #f8fafc; border: 1px solid #f1f5f9; padding: 6px; border-radius: 8px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .item-ctrls button:hover { background: white; color: black; border-color: #3b82f6; transform: scale(1.1); }
        .item-ctrls button:active { transform: scale(0.9); }
        .modal-fix { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-content { background: white; padding: 2.5rem; border-radius: 24px; width: 90%; max-width: 550px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        @keyframes spinAround { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-wrapper { display: inline-flex; animation: spinAround 0.8s linear infinite !important; }
        .btn { border-radius: 12px; cursor: pointer; transition: all 0.2s; border: none; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .btn:active { transform: scale(0.96); }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .text-primary { color: #3b82f6; }
        .text-danger { color: #ef4444; }
        .text-warning { color: #f59e0b; }
        .text-pink { color: #ec4899; }
      `}</style>

      {isLoading ? <div style={{ padding: '8rem', textAlign: 'center' }}><span className="spin-wrapper"><Loader2 size={42} color="#3b82f6" /></span></div> : !avatar ? <div style={{ padding: '4rem', textAlign: 'center' }}>Аватар не найден</div> : (
        <>
          {editingItem && (
            <div className="modal-fix">
              <div className="modal-content">
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 900, fontSize: '1.25rem' }}>Редактирование</h3>
                {Object.keys(editingItem.data).map(k => (
                  <div key={k} style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</label>
                    <textarea value={editingItem.data[k]} onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, [k]: e.target.value } })} style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', outline: 'none' }} rows={4} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button onClick={() => {
                    const updated = JSON.parse(JSON.stringify(avatar));
                    if (editingItem.section === 'outcomes') updated.outcomes.items[editingItem.idx] = editingItem.data;
                    else updated[editingItem.section][editingItem.idx] = editingItem.data;
                    saveUpdatedAvatar(updated);
                    setEditingItem(null);
                  }} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '1rem' }}>Сохранить</button>
                  <button onClick={() => setEditingItem(null)} style={{ flex: 1, background: '#f8fafc', color: '#64748b', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, cursor: 'pointer' }}>Отмена</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Проекты</Link>
            <span>/</span>
            <Link href={`/project/${params.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{project?.name || project?.productName || 'Проект'}</Link>
            <span>/</span>
            <span style={{ color: '#1e293b' }}>{avatar.segmentName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
            <button onClick={() => router.back()} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}><ArrowLeft size={20} /></button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.15em', fontWeight: 800, marginBottom: '0.4rem' }}>Проект: {project?.name || project?.productName || '...'}</div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>{avatar.segmentName}</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.4rem', fontWeight: 500 }}>Полное исследование сегмента аудитории. Вы можете править любой параметр</p>
            </div>
            <Link href={`/project/${params.id}/generate`} className="btn btn-primary" style={{ padding: '0.85rem 1.5rem', textDecoration: 'none' }}>Генерация креативов →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <section className="card">
              <h3 style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Brain size={16} /> Психологический портрет</h3>
              <textarea value={avatar.portrait} onChange={e => setAvatar({ ...avatar, portrait: e.target.value })} onBlur={() => saveUpdatedAvatar(avatar)} onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '1.05rem', fontStyle: 'italic', lineHeight: 1.8, outline: 'none', resize: 'none', minHeight: '100px', overflow: 'hidden', color: '#334155' }} />
            </section>

            {[
              { title: 'JTBD (Задачи)', key: 'jtbd', icon: Target, color: 'text-primary' },
              { title: 'Боли сегмента', key: 'pains', icon: Flame, color: 'text-danger' },
              { title: 'Симптомы болей', key: 'symptoms', icon: AlertCircle, color: 'text-warning' },
              { title: 'Глубинные страхи', key: 'fears', icon: ShieldAlert, color: 'text-primary' },
              { title: 'Маркеры поведения', key: 'behaviorMarkers', icon: Footprints, color: 'text-muted' },
              { title: 'Мотивация', key: 'motivations', icon: Heart, color: 'text-pink' },
              { title: 'Возражения', key: 'objections', icon: MessageSquare, color: 'text-danger' }
            ].map(sec => (
              <section key={sec.key} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <h2 className={sec.color} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.35rem', fontWeight: 900, margin: 0 }}><sec.icon size={22} /> {sec.title}</h2>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => handleManualAdd(sec.key)} style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}>+ Вручную</button>
                    <button onClick={() => handleAction('add', sec.key)} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', minWidth: '120px', justifyContent: 'center' }}>
                      {workingKey === `${sec.key}-new` ? <span className="spin-wrapper"><Loader2 size={14} /></span> : <Plus size={14} />} AI Добавить
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {(avatar[sec.key] || []).map((item: any, i: number) => (
                    <div key={i} className={`item-mini-card`}>
                      <div className="item-ctrls">
                        <div className="drag-hnd" draggable onDragStart={() => onDragStart(sec.key, i)}><GripVertical size={14} /></div>
                        <button onClick={() => setEditingItem({ section: sec.key, idx: i, data: item })}><Edit3 size={12} /></button>
                        <button onClick={() => handleAction('replace', sec.key, i)}>
                          {workingKey === `${sec.key}-${i}` ? <span className="spin-wrapper"><RefreshCw size={12} /></span> : <RefreshCw size={12} />}
                        </button>
                        <button onClick={() => handleDeleteItem(sec.key, i)} style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '0.6rem', paddingRight: '90px', color: '#1e293b', lineHeight: 1.4 }}>{item.job || item.pain || item.fear || item.symptom || item.marker || item.motivation || item.objection}</div>
                      {(item.frequency_rating || sec.key === 'motivations') && <div style={{ display: 'flex', gap: '3px', color: '#fbbf24', marginBottom: '0.75rem' }}>{[...Array(5)].map((_, iR) => <Star key={iR} size={11} fill={iR < (item.frequency_rating || 0) ? 'currentColor' : 'none'} />)}</div>}
                      <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>"{item.context}"</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="card" style={{ border: '1.5px solid #10b981', background: '#f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: '#065f46', fontSize: '1.35rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}><CheckCircle2 size={22} /> Результаты (Outcomes)</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => handleManualAdd('outcomes')} style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', border: 'none', background: 'none', cursor: 'pointer' }}>+ Вручную</button>
                  <button onClick={() => handleAction('add', 'outcomes')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', minWidth: '120px', justifyContent: 'center' }}>
                    {workingKey === 'outcomes-new' ? <span className="spin-wrapper"><Loader2 size={14} /></span> : <Plus size={14} />} AI Добавить
                  </button>
                </div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', marginBottom: '2rem', textAlign: 'center', fontWeight: 900, fontSize: '1.15rem', color: '#064e3b', border: '1px solid #d1fae5', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>«{avatar.outcomes?.mainPromise}»</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {(avatar.outcomes?.items || []).map((item: any, i: number) => (
                  <div key={i} className={`item-mini-card`} style={{ background: 'white' }}>
                    <div className="item-ctrls">
                      <div className="drag-hnd" draggable onDragStart={() => onDragStart('outcomes', i)}><GripVertical size={14} /></div>
                      <button onClick={() => setEditingItem({ section: 'outcomes', idx: i, data: item })}><Edit3 size={12} /></button>
                      <button onClick={() => handleAction('replace', 'outcomes', i)}>
                        {workingKey === `outcomes-${i}` ? <span className="spin-wrapper"><RefreshCw size={12} /></span> : <RefreshCw size={12} />}
                      </button>
                      <button onClick={() => handleDeleteItem('outcomes', i)} style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
                    </div>
                    <div style={{ fontWeight: 900, color: '#065f46', fontSize: '1.05rem', paddingRight: '90px', marginBottom: '0.4rem', lineHeight: 1.4 }}>✅ {item.outcome}</div>
                    <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.explanation}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 className="text-primary" style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Footprints size={22} /> Карта CJM</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => handleManualAdd('cjm')} style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}>+ Вручную</button>
                  <button onClick={() => handleAction('add', 'cjm')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', minWidth: '120px', justifyContent: 'center' }}>
                    {workingKey === 'cjm-new' ? <span className="spin-wrapper"><Loader2 size={14} /></span> : <Plus size={14} />} AI Добавить
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(avatar.cjm || []).map((item: any, i: number) => (
                  <div key={i} className={`item-mini-card`}>
                    <div className="item-ctrls">
                      <div className="drag-hnd" draggable onDragStart={() => onDragStart('cjm', i)}><GripVertical size={14} /></div>
                      <button onClick={() => setEditingItem({ section: 'cjm', idx: i, data: item })}><Edit3 size={12} /></button>
                      <button onClick={() => handleAction('replace', 'cjm', i)}>
                        {workingKey === `cjm-${i}` ? <span className="spin-wrapper"><RefreshCw size={12} /></span> : <RefreshCw size={12} />}
                      </button>
                      <button onClick={() => handleDeleteItem('cjm', i)} style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
                    </div>
                    <div style={{ fontWeight: 950, fontSize: '1.1rem', color: '#1e293b', marginBottom: '1.25rem', paddingRight: '110px' }}>{item.title || `Сценарий #${i + 1}`}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {(item.scenario || '').split(/\n|(?=\d+\.)/).map((s: string) => s.trim()).filter((s: string) => s.length > 3).map((step: string, sIdx: number) => (
                        <div key={sIdx} style={{ display: 'flex', gap: '1.25rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '15px', fontSize: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, flexShrink: 0, color: '#3b82f6', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>{sIdx + 1}</div>
                          <div style={{ color: '#334155', lineHeight: 1.7 }}>{step.replace(/^\d+\.\s*/, '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
