'use client';

import { use, useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import {
  Target, AlertTriangle, ShieldAlert, MessageSquareX,
  Route, Zap, User, ChevronDown, ChevronUp,
  RefreshCcw, Trash2, Plus, Download, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const SECTION_META: Record<string, { icon: any; label: string; color: string }> = {
  jtbd:            { icon: Target,           label: 'Jobs To Be Done (JTBD)',    color: '#3b82f6' },
  pains:           { icon: AlertTriangle,    label: 'Боли аудитории',            color: '#f59e0b' },
  fears:           { icon: ShieldAlert,      label: 'Страхи',                    color: '#ef4444' },
  objections:      { icon: MessageSquareX,  label: 'Возражения и ответы',       color: '#8b5cf6' },
  behaviorMarkers: { icon: Zap,             label: 'Маркеры поведения',         color: '#06b6d4' },
  cjm:             { icon: Route,           label: 'Сценарии CJM',              color: '#10b981' },
  motivations:     { icon: Zap,             label: 'Мотивации',                 color: '#f97316' },
};

function RatingDots({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: i <= value ? '#ef4444' : 'var(--border)'
        }} />
      ))}
    </div>
  );
}

function Section({ 
  sectionKey, 
  data, 
  segmentName,
  briefContext,
  onUpdate 
}: { 
  sectionKey: string; 
  data: any[]; 
  segmentName: string;
  briefContext: any;
  onUpdate: (newData: any[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const meta = SECTION_META[sectionKey];
  if (!meta) return null;
  const Icon = meta.icon;

  const handleDelete = (idx: number) => {
    const newData = [...data];
    newData.splice(idx, 1);
    onUpdate(newData);
  };

  const handleRegenerate = async (idx: number) => {
    setLoadingIdx(idx);
    try {
      const res = await fetch('/api/avatar/regenerate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          sectionKey,
          existingItems: data,
          segmentName,
          briefContext
        })
      });
      const resData = await res.json();
      if (resData.item) {
        const newData = [...data];
        newData[idx] = resData.item;
        onUpdate(newData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIdx(null);
    }
  };

  const handleAddAI = async () => {
    setIsAdding(true);
    try {
      const res = await fetch('/api/avatar/regenerate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          sectionKey,
          existingItems: data,
          segmentName,
          briefContext
        })
      });
      const resData = await res.json();
      if (resData.item) {
        onUpdate([...data, resData.item]);
        setOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveManual = () => {
    if (!manualInput.trim()) return;
    let item: any = {};
    if (sectionKey === 'jtbd') item = { job: manualInput };
    else if (sectionKey === 'pains') item = { pain: manualInput, frequency_rating: 4 };
    else if (sectionKey === 'fears') item = { fear: manualInput, frequency_rating: 4 };
    else if (sectionKey === 'objections') item = { objection: manualInput, howToRemove: '...' };
    else if (sectionKey === 'behaviorMarkers') item = { marker: manualInput };
    else if (sectionKey === 'cjm') item = { scenario: manualInput };
    else if (sectionKey === 'motivations') item = { motivation: manualInput };
    
    onUpdate([...data, item]);
    setManualInput('');
    setIsAddingManual(false);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'visible' }}>
      <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.5rem', background: 'transparent',
          borderBottom: open ? '1px solid var(--border)' : 'none'
      }}>
        <button onClick={() => setOpen(!open)} style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{
            width: 36, height: 36, borderRadius: '50%',
            background: meta.color + '18', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: meta.color, flexShrink: 0
          }}>
            <Icon size={18} />
          </span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: '1rem' }}>{meta.label}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
            {data.length} пунктов
          </span>
          {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </button>
      </div>

      {open && (
        <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
          {data.length === 0 && <p style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>Нет данных.</p>}
          {data.map((item: any, i: number) => (
            <div key={i} className="item-row" style={{
              background: 'var(--secondary)', borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem', borderLeft: `3px solid ${meta.color}`,
              position: 'relative', display: 'flex', gap: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                {item.job && <>
                  <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{item.job}</p>
                  {item.context && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>«{item.context}»</p>}
                </>}
                {item.pain && <>
                  <p style={{ fontWeight: 600 }}>{item.pain}</p>
                  {item.frequency_rating && <RatingDots value={item.frequency_rating} />}
                </>}
                {item.fear && <>
                  <p style={{ fontWeight: 600 }}>{item.fear}</p>
                  {item.frequency_rating && <RatingDots value={item.frequency_rating} />}
                </>}
                {item.objection && <>
                  <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>❌ {item.objection}</p>
                  {item.howToRemove && <p style={{ fontSize: '0.875rem', color: '#10b981' }}>✅ {item.howToRemove}</p>}
                </>}
                {item.marker && <p style={{ fontWeight: 500 }}>「{item.marker}」</p>}
                {item.scenario && <p style={{ fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.scenario}</p>}
                {item.motivation && <p style={{ fontWeight: 500, fontStyle: 'italic' }}>💡 {item.motivation}</p>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: loadingIdx === i ? 1 : undefined }} className="item-actions">
                <button onClick={() => handleRegenerate(i)} disabled={loadingIdx === i} className="btn-icon" title="Заменить новым смыслом (AI)">
                  {loadingIdx === i ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                </button>
                <button onClick={() => handleDelete(i)} disabled={loadingIdx === i} className="btn-icon hover-red" title="Удалить">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Add Form Component */}
          <div style={{ marginTop: '0.5rem' }}>
            {isAddingManual ? (
              <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <textarea 
                  autoFocus
                  rows={2} 
                  value={manualInput} 
                  onChange={e => setManualInput(e.target.value)} 
                  placeholder="Опишите смысл..."
                  style={{ width: '100%', marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsAddingManual(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Отмена</button>
                  <button onClick={handleSaveManual} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Сохранить</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setIsAddingManual(true)} className="btn btn-secondary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Plus size={16} /> Вписать вручную
                </button>
                <button onClick={handleAddAI} disabled={isAdding} className="btn" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', background: 'transparent' }}>
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} color="var(--primary)" />} Сгенерировать AI
                </button>
              </div>
            )}
          </div>

        </div>
      )}
      <style jsx>{`
        .item-actions { opacity: 0; transition: opacity 0.2s; }
        .item-row:hover .item-actions { opacity: 1; }
        .btn-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--background); cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
        .btn-icon:hover { background: var(--secondary-hover); color: var(--foreground); }
        .btn-icon.hover-red:hover { border-color: #fca5a5; background: #fee2e2; color: #ef4444; }
        .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default function AvatarDetail({ params }: { params: Promise<{ id: string; avatarId: string }> }) {
  const { id, avatarId } = use(params);
  const [avatar, setAvatar] = useState<any | null>(null);
  const [allAvatars, setAllAvatars] = useState<any[]>([]);
  const [briefContext, setBriefContext] = useState<any>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('tempGeneratedAvatars');
      const brief = localStorage.getItem('tempBrief');
      if (stored) {
        const all = JSON.parse(stored);
        setAllAvatars(all);
        const idx = parseInt(avatarId, 10);
        setAvatar(all[idx] || null);
      }
      if (brief) setBriefContext(JSON.parse(brief));
    } catch (e) {}
  }, [avatarId]);

  const saveAvatar = (newAvatarData: any) => {
    setAvatar({ ...newAvatarData });
    const idx = parseInt(avatarId, 10);
    const newAll = [...allAvatars];
    newAll[idx] = newAvatarData;
    setAllAvatars(newAll);
    localStorage.setItem('tempGeneratedAvatars', JSON.stringify(newAll));
    
    // In real env, save to Supabase too
    const currentProjectId = localStorage.getItem('currentProjectId');
    if (currentProjectId && currentProjectId !== 'temp-id') {
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: currentProjectId,  // need id to update (api doesn't support update yet, but mock works)
          avatars: newAll 
        })
      });
    }
  };

  const handleExportExcel = () => {
    if (!avatar) return;
    setIsExporting(true);
    try {
      const rows: any[] = [];
      const sections = ['jtbd', 'pains', 'fears', 'objections', 'behaviorMarkers', 'cjm', 'motivations'];
      
      sections.forEach(s => {
        if (avatar[s]) {
          avatar[s].forEach((item: any) => {
            let content = '';
            let metaInfo = '';
            
            if (item.job) { content = item.job; metaInfo = item.context || ''; }
            else if (item.pain) { content = item.pain; metaInfo = `Рейтинг: ${item.frequency_rating}/5`; }
            else if (item.fear) { content = item.fear; metaInfo = `Рейтинг: ${item.frequency_rating}/5`; }
            else if (item.objection) { content = item.objection; metaInfo = `Ответ: ${item.howToRemove}`; }
            else if (item.marker) { content = item.marker; }
            else if (item.scenario) { content = item.scenario; }
            else if (item.motivation) { content = item.motivation; }

            rows.push({
              "Категория": SECTION_META[s]?.label || s,
              "Содержание": content,
              "Дополнительно": metaInfo
            });
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Avatar Data");
      
      const safeName = avatar.segmentName.replace(/[^a-zA-Z0-9-рА-Яа-я]/g, '_').substring(0, 30);
      XLSX.writeFile(workbook, `Avatar_${safeName}.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  };

  if (!avatar) {
    return (
      <div>
        <BackButton fallbackUrl={`/project/${id}`} />
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Аватар не найден.</p>
        </div>
      </div>
    );
  }

  const sections = ['jtbd', 'pains', 'fears', 'objections', 'behaviorMarkers', 'cjm', 'motivations'];

  return (
    <div>
      <BackButton fallbackUrl={`/project/${id}`} />

      {/* Шапка */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--card) 0%, var(--secondary) 100%)' }}>
        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <User size={28} color="#fff" />
            </div>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>Полный профиль аватара</span>
              <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{avatar.segmentName}</h1>
              {avatar.portrait && (
                <p style={{ lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: '700px' }}>
                  {avatar.portrait}
                </p>
              )}
            </div>
          </div>
          
          <button onClick={handleExportExcel} disabled={isExporting} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
            Скачать XLSX
          </button>
        </div>

        {/* Счетчики */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {sections.filter(s => avatar[s]?.length).map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 700, color: SECTION_META[s]?.color }}>{avatar[s].length}</span>
              <span style={{ color: 'var(--text-muted)' }}>{SECTION_META[s]?.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Секции */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {sections.map(s => (
          <Section 
            key={s} 
            sectionKey={s} 
            data={avatar[s] || []} 
            segmentName={avatar.segmentName}
            briefContext={briefContext}
            onUpdate={(newData) => {
              saveAvatar({ ...avatar, [s]: newData });
            }}
          />
        ))}
      </div>
    </div>
  );
}
