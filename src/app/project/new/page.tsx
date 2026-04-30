'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, FilePlus, Users, Layout } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['Образование', 'Услуги', 'Товары', 'IT/SaaS', 'B2B', 'Другое'];
const INCOME_LEVELS = ['Низкий', 'Средний', 'Высокий', 'Любой'];
const COUNTRIES = [
  { code: 'UA', name: 'Украина' },
  { code: 'KZ', name: 'Казахстан' },
  { code: 'RU', name: 'Россия' },
  { code: 'BY', name: 'Беларусь' },
  { code: 'PL', name: 'Польша' },
  { code: 'DE', name: 'Германия' },
  { code: 'US', name: 'США' },
  { code: 'Other', name: 'Другое' }
];

export default function NewProjectPage() {
  const router = useRouter();

  // Form states
  const [projectName, setProjectName] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [advantages, setAdvantages] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [briefDocUrl, setBriefDocUrl] = useState('');
  const [useBriefOnly, setUseBriefOnly] = useState(false);
  const [audienceDesc, setAudienceDesc] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('Любой');
  const [profession, setProfession] = useState('');
  const [income, setIncome] = useState(INCOME_LEVELS[1]);
  const [geo, setGeo] = useState<string[]>([]);
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [targetSegments, setTargetSegments] = useState<string[]>(['']);
  const [existingAds, setExistingAds] = useState('');
  const [objections, setObjections] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'parsing' | 'identifying' | 'selection' | 'researching' | 'saving' | null>(null);
  const [foundSegments, setFoundSegments] = useState<any[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [completedSegments, setCompletedSegments] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [briefState, setBriefState] = useState<any>(null);
  const [currentResearchingSegment, setCurrentResearchingSegment] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (geo.length === 0) { setErrorMsg('Выберите ГЕО'); return; }
    if (!desiredOutcome.trim()) { setErrorMsg('Опишите результат продукта'); return; }

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const briefData: any = {
        productName: productName || projectName,
        category, description, advantages, landingUrl, briefDocUrl, useBriefOnly,
        audienceDesc, ageRange, gender, profession, income, geo, objections, desiredOutcome, existingAds,
        targetSegments: targetSegments.filter(s => s.trim() !== '')
      };
      setBriefState(briefData);

      // 1. Parsing Landing
      if (landingUrl && !useBriefOnly) {
        setGenerationStep('parsing');
        const pRes = await fetch('/api/parse-landing', { method: 'POST', body: JSON.stringify({ url: landingUrl }) });
        if (pRes.ok) {
          const d = await pRes.json();
          briefData.description += '\n\nКонтекст сайта: ' + d.content;
        }
      }

      // Если сегменты указаны вручную — идем сразу в исследование
      if (briefData.targetSegments.length > 0) {
        setFoundSegments(briefData.targetSegments.map((s: string) => ({ segmentName: s })));
        handleStartResearch(briefData.targetSegments.map((s: string) => ({ segmentName: s })), briefData);
        return;
      }

      // 2. Identify 10 Segments
      setGenerationStep('identifying');
      const identRes = await fetch('/api/generate-avatars?step=identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefData)
      });
      const identData = await identRes.json();
      if (!identRes.ok) throw new Error(identData.error || 'Ошибка при поиске сегментов');

      setFoundSegments(identData.segments || []);
      setGenerationStep('selection');

    } catch (err: any) {
      setErrorMsg(err.message);
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  const handleStartResearch = async (segmentsToResearch: any[], customBrief?: any) => {
    const finalBrief = customBrief || briefState;
    if (segmentsToResearch.length === 0) return;

    setGenerationStep('researching');
    setCompletedSegments(0);

    try {
      const avatarResults = await Promise.all(segmentsToResearch.map(async (seg: any, i: number) => {
        // Мягкий каскадный старт: 1-й сразу, 2-й через 0.5с и т.д.
        await new Promise(resolve => setTimeout(resolve, i * 500));

        console.log(`Processing segment ${i + 1}/${segmentsToResearch.length}: ${seg.segmentName}`);

        let attempts = 0;
        const maxAttempts = 3;
        let segmentResult: any = null;

        while (attempts < maxAttempts) {
          try {
            const res = await fetch(`/api/generate-avatars?step=research&segment=${encodeURIComponent(seg.segmentName)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(finalBrief)
            });
            segmentResult = await res.json();

            if (segmentResult && !segmentResult.error) {
              console.log(`Success for: ${seg.segmentName}`);
              break;
            } else {
              console.warn(`Attempt ${attempts + 1} failed for ${seg.segmentName}: ${segmentResult?.message}`);
            }
          } catch (e) {
            console.error(`Fetch error on ${seg.segmentName}:`, e);
          }
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2500));
          }
        }

        if (!segmentResult || segmentResult.error) {
          throw new Error(`Не удалось исследовать сегмент "${seg.segmentName}" после ${maxAttempts} попыток. Попробуйте еще раз.`);
        }

        setCompletedSegments(prev => prev + 1);
        return segmentResult;
      }));

      setGenerationStep('saving');
      const sRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalBrief.productName,
          brief: finalBrief,
          avatars: avatarResults
        })
      });

      const sData = await sRes.json();
      if (sData.saved) {
        router.push(`/project/${sData.id}`);
      } else {
        throw new Error(sData.reason || 'Ошибка при сохранении проекта');
      }
    } catch (err: any) {
      console.error('Research error:', err);
      alert(err.message || 'Произошла ошибка при генерации. Попробуйте еще раз.');
      setGenerationStep('selection');
    } finally {
      setCurrentResearchingSegment(null);
    }
  };


  const toggleSegmentSelection = (name: string) => {
    setSelectedSegments(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 4 ? [...prev, name] : prev
    );
  };

  const addSegment = () => setTargetSegments([...targetSegments, '']);
  const removeSegment = (i: number) => setTargetSegments(targetSegments.filter((_, idx) => idx !== i));
  const updateSegment = (i: number, v: string) => {
    const next = [...targetSegments];
    next[i] = v;
    setTargetSegments(next);
  };

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
        <style>{`
          @keyframes custom-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .force-spin { animation: custom-spin 1.5s linear infinite !important; }
          .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 1rem 0; }
          .progress-fill { height: 100%; background: #3b82f6; transition: width 0.4s ease; }
          .segment-card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 1rem; cursor: pointer; transition: all 0.2s; text-align: left; background: white; }
          .segment-card.selected { border-color: #3b82f6; background: #eff6ff; }
          .segment-card:hover { border-color: #3b82f6; }
        `}</style>

        <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 800, width: '100%', borderRadius: '32px' }}>
          {generationStep !== 'selection' && (
            <Loader2 size={64} className="force-spin" color="#3b82f6" style={{ marginBottom: '2rem' }} />
          )}

          {generationStep === 'selection' ? (
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '1rem' }}>Выберите до 4 сегментов для глубокого анализа</h2>
              <p style={{ color: '#64748b', marginBottom: '2.5rem' }}>ИИ предложил 10 вариантов. Выберите те, которые максимально актуальны для ваших целей.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                {foundSegments.map((s, i) => (
                  <div
                    key={i}
                    className={`segment-card ${selectedSegments.includes(s.segmentName) ? 'selected' : ''}`}
                    onClick={() => toggleSegmentSelection(s.segmentName)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem' }}>{s.segmentName}</span>
                      {selectedSegments.includes(s.segmentName) && <div style={{ background: '#3b82f6', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</div>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>{s.summary}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  onClick={() => setIsGenerating(false)}
                  className="btn btn-secondary"
                  style={{ padding: '1rem 2rem' }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleStartResearch(foundSegments.filter(s => selectedSegments.includes(s.segmentName)))}
                  className="btn btn-primary"
                  disabled={selectedSegments.length === 0}
                  style={{ padding: '1rem 3rem' }}
                >
                  Начать глубокое исследование ({selectedSegments.length}/4)
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 950, marginBottom: '0.5rem' }}>
                {generationStep === 'parsing' && 'Анализируем лендинг...'}
                {generationStep === 'identifying' && 'Ищем сегменты аудитории...'}
                {generationStep === 'researching' && 'Проводим глубокое исследование...'}
                {generationStep === 'saving' && 'Сохраняем проект...'}
              </h2>

              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                {generationStep === 'researching'
                  ? `Прорабатываем психологический портрет (${completedSegments + 1} из ${selectedSegments.length})...`
                  : 'Это займет около 1-2 минут. Не закрывайте страницу.'}
              </p>

              {generationStep === 'researching' && (
                <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(completedSegments / selectedSegments.length) * 100}%` }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedSegments.map((name, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '1rem',
                        fontWeight: i === completedSegments ? 800 : 500,
                        color: i < completedSegments ? '#10b981' : i === completedSegments ? '#3b82f6' : '#94a3b8'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>
                          {i < completedSegments ? '✅' : i === completedSegments ? '⏳' : '⚪️'}
                        </span>
                        <span>{name}</span>
                        {i === completedSegments && <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 500 }}>(в процессе...)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem 5rem' }}>
      <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', padding: '1rem 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 600 }}>
        <ArrowLeft size={20} /> Назад
      </button>

      <h1 style={{ fontSize: '2.5rem', fontWeight: 950, color: '#1e293b', marginBottom: '0.5rem' }}>Новое исследование</h1>
      <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '3rem' }}>Вставьте ссылку на бриф или заполните форму вручную.</p>

      {errorMsg && <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '1rem', borderRadius: '12px', marginBottom: '2.5rem', color: '#b91c1c', fontWeight: 700 }}>{errorMsg}</div>}

      <form onSubmit={handleSubmit} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && e.preventDefault()} style={{ display: 'grid', gap: '2rem' }}>
        <section className="card">
          <label className="form-group">
            <span style={{ fontWeight: 800 }}>Название проекта</span>
            <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Дата Аналитик..." />
          </label>
        </section>

        <section className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FilePlus size={20} /> Ссылка на подробный бриф</h3>
          <label className="form-group">
            <span>Google Doc (убедитесь, что доступ открыт)</span>
            <input type="url" value={briefDocUrl} onChange={e => setBriefDocUrl(e.target.value)} placeholder="https://docs.google.com/..." />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', cursor: 'pointer', justifyContent: 'flex-start', width: 'fit-content' }}>
            <input type="checkbox" checked={useBriefOnly} onChange={e => setUseBriefOnly(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Использовать ТОЛЬКО бриф (игнорировать форму ниже)</span>
          </label>
        </section>

        <section className="card" style={{ background: '#fdfbff', border: '1px solid #f3e8ff' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
            <Users size={20} /> Задать направление (Опционально)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#7c3aed', marginBottom: '1.25rem', fontWeight: 500 }}>
            Укажите до 3-х сегментов, на которых ИИ должен сфокусироваться. Если оставить пустым — ИИ сам определит лучшие сегменты.
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {targetSegments.map((seg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={seg}
                  onChange={e => updateSegment(i, e.target.value)}
                  placeholder={`Название сегмента ${i + 1}...`}
                  style={{ flex: 1 }}
                />
                {targetSegments.length > 1 && (
                  <button type="button" onClick={() => removeSegment(i)} style={{ padding: '0 0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>×</button>
                )}
              </div>
            ))}
            {targetSegments.length < 3 && (
              <button type="button" onClick={addSegment} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#8b5cf6', fontWeight: 700, cursor: 'pointer', padding: '0.5rem 0' }}>+ Добавить сегмент</button>
            )}
          </div>
        </section>

        {!useBriefOnly && (
          <>
            <section className="card">
              <h3 className="card-title"><Layout size={20} /> О продукте</h3>
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
                <label className="form-group"><span>Название продукта</span><input type="text" value={productName} onChange={e => setProductName(e.target.value)} /></label>
                <label className="form-group"><span>Категория</span><select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
                <label className="form-group col-span-2"><span>Описание продукта</span><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></label>
                <div className="form-group col-span-2"><span>Landing URL</span><input type="url" value={landingUrl} onChange={e => setLandingUrl(e.target.value)} /></div>
              </div>
            </section>

            <section className="card">
              <h3 className="card-title"><Users size={20} /> Аудитория</h3>
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
                <label className="form-group col-span-2"><span>Описание аудитории (если есть)</span><textarea rows={2} value={audienceDesc} onChange={e => setAudienceDesc(e.target.value)} /></label>
                <label className="form-group"><span>Возраст</span><input type="text" value={ageRange} onChange={e => setAgeRange(e.target.value)} placeholder="25-45" /></label>
                <label className="form-group"><span>Пол</span><select value={gender} onChange={e => setGender(e.target.value)}><option>Любой</option><option>Мужской</option><option>Женский</option></select></label>
                <label className="form-group"><span>Профессия</span><input type="text" value={profession} onChange={e => setProfession(e.target.value)} /></label>
                <label className="form-group"><span>Доход</span><select value={income} onChange={e => setIncome(e.target.value)}>{INCOME_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></label>
              </div>
            </section>
          </>
        )}

        <section className="card" style={{ border: '2px solid #3b82f6', background: '#f0f7ff' }}>
          <h3 className="card-title" style={{ color: '#2563eb' }}><Layout size={20} /> Ожидаемый результат и ГЕО</h3>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="form-group">
              <span style={{ fontWeight: 800 }}>Страны (ГЕО)</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {COUNTRIES.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      if (geo.includes(country.name)) setGeo(geo.filter(g => g !== country.name));
                      else setGeo([...geo, country.name]);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: geo.includes(country.name) ? '#3b82f6' : 'white',
                      color: geo.includes(country.name) ? 'white' : '#1e293b',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {country.name}
                  </button>
                ))}
              </div>
            </div>
            <label className="form-group">
              <span style={{ fontWeight: 800 }}>Большой результат (Обязательно)</span>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Итоговый результат, который получит клиент (например: "Увеличить продажи в 2 раза")</p>
              <textarea rows={2} value={desiredOutcome} onChange={e => setDesiredOutcome(e.target.value)} placeholder="Получить новую профессию и зарабатывать больше от 1000 евро в месяц" />
            </label>
          </div>
        </section>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '1.25rem', fontSize: '1.1rem', fontWeight: 900, marginTop: '1rem', width: '100%', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
        >
          Запустить создание аватаров
        </button>
      </form>
    </div>
  );
}
