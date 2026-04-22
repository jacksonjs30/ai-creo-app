'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { Settings, Users, Target, FileText, Plus, Trash2, Loader2 } from 'lucide-react';

const CATEGORIES = ["Онлайн-курс", "Физический продукт", "Услуга", "SaaS", "Другое"];
const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"];
const INCOME_LEVELS = ["Низкий", "Средний", "Выше среднего", "Высокий"];
const GENDERS = ["Все", "Преимущественно мужчины", "Преимущественно женщины"];
const COUNTRIES = ["Украина", "Казахстан", "Россия", "Беларусь", "Польша", "Германия", "США", "Другое"];
const LANGUAGES = ["Русский", "Украинский", "Английский", "Другой"];

export default function NewProject() {
  const router = useRouter();
  
  // A - Продукт
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [advantages, setAdvantages] = useState<string[]>(['']);
  const [landingUrl, setLandingUrl] = useState('');
  const [price, setPrice] = useState('');

  // B - Аудитория
  const [audienceDesc, setAudienceDesc] = useState('');
  const [ageRange, setAgeRange] = useState<string[]>([]);
  const [gender, setGender] = useState(GENDERS[0]);
  const [profession, setProfession] = useState('');
  const [income, setIncome] = useState(INCOME_LEVELS[1]);
  const [priorProducts, setPriorProducts] = useState('');

  // C - Гео
  const [geo, setGeo] = useState<string[]>([]);
  const [adLang, setAdLang] = useState<string[]>(["Русский"]);

  // D - Контекст
  const [existingAds, setExistingAds] = useState('');
  const [objections, setObjections] = useState('');

  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const LOADING_STAGES = [
    { label: 'Читаем ваш бриф...', pct: 10 },
    { label: 'Парсим лендинг...', pct: 25 },
    { label: 'AI анализирует аудиторию...', pct: 55 },
    { label: 'Строим психологические портреты...', pct: 80 },
    { label: 'Сохраняем проект...', pct: 95 },
  ];

  const handleAddAdvantage = () => {
    if (advantages.length < 5) setAdvantages([...advantages, '']);
  };

  const handleUpdateAdvantage = (index: number, val: string) => {
    const newAdv = [...advantages];
    newAdv[index] = val;
    setAdvantages(newAdv);
  };

  const handleRemoveAdvantage = (index: number) => {
    setAdvantages(advantages.filter((_, i) => i !== index));
  };

  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, array: string[], item: string) => {
    if (array.includes(item)) setter(array.filter(i => i !== item));
    else setter([...array, item]);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsGenerating(true);
    setLoadingStageIdx(0);

    try {
      const briefData = {
        productName, category, description, advantages, landingUrl, price,
        audienceDesc, ageRange, gender, profession, income, priorProducts,
        geo, adLang,
        existingAds, objections
      };

      if (landingUrl) {
        setLoadingStageIdx(1);
        try {
          const parseRes = await fetch('/api/parse-landing', {
            method: 'POST', body: JSON.stringify({ url: landingUrl })
          });
          if (parseRes.ok) {
            const parsed = await parseRes.json();
            briefData.description += '\n\nРасширенный контекст с сайта: ' + parsed.content.substring(0, 500);
          }
        } catch(e) { console.error(e); }
      }
      
      setLoadingStageIdx(2);
      const res = await fetch('/api/generate-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefData)
      });
      
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'Ошибка генерации');
      }
      
      setLoadingStageIdx(3);
      const generatedAvatars = await res.json();
      const segments = generatedAvatars.segments || [];

      // Всегда сохраняем в localStorage как fallback
      localStorage.setItem('tempGeneratedAvatars', JSON.stringify(segments));
      localStorage.setItem('tempBrief', JSON.stringify(briefData));

      // Пробуем сохранить в Supabase
      setLoadingStageIdx(4);
      let projectId = 'temp-id';
      try {
        const saveRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: productName || 'Новый проект',
            brief: briefData,
            avatars: segments,
          })
        });
        const saveData = await saveRes.json();
        if (saveData.id && saveData.id !== 'temp-id') {
          projectId = saveData.id;
          localStorage.setItem('currentProjectId', projectId);
        }
      } catch (saveErr) {
        console.warn('Supabase save failed, using localStorage fallback', saveErr);
      }

      router.push(`/project/${projectId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Неизвестная ошибка. Попробуйте снова.');
      setIsGenerating(false);
    }
  };


  if (isGenerating) {
    const stage = LOADING_STAGES[loadingStageIdx];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 4rem', maxWidth: 480, width: '100%' }}>
          {/* Пульсирующий логотип */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 30px rgba(59,130,246,0.4)'
          }}>
            <Loader2 size={32} color="white" style={{ animation: 'spin 1s linear infinite' }} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Генерируем Аватары</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', minHeight: '1.5em' }}>{stage.label}</p>

          {/* Прогресс-бар */}
          <div style={{ background: 'var(--secondary)', height: '8px', borderRadius: '99px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{
              width: `${stage.pct}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--accent))',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              borderRadius: '99px'
            }} />
          </div>

          {/* Шаги */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {LOADING_STAGES.map((s, i) => (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i <= loadingStageIdx ? 'var(--primary)' : 'var(--border)',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
            Не закрывайте страницу — обычно это занимает 3-10 секунд
          </p>
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <BackButton />
      <h1 className="page-title">Шаг 1: Бриф продукта</h1>
      <p className="page-subtitle">Чем подробнее вы заполните бриф, тем точнее AI попадет в боли вашей аудитории.</p>

      {errorMsg && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)',
          padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex',
          alignItems: 'flex-start', gap: '0.75rem', color: '#991b1b'
        }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
          <div>
            <strong>Ошибка генерации:</strong> {errorMsg}
            <br/><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Проверьте настройки API или попробуйте снова.</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
        
        {/* БЛОК A */}
        <section className="card">
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} className="text-gradient" /> Блок A: О Продукте
            </h3>
          </div>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <label className="form-group">
              <span>Название продукта / курса</span>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} required placeholder="Например: Курс 'Финансовый менеджмент'" />
            </label>
            <label className="form-group">
              <span>Категория</span>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            
            <label className="form-group col-span-2">
              <span>Описание (что это, для кого, главный результат)</span>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Курс для собственников бизнеса, который учит читать отчеты..."></textarea>
            </label>

            <label className="form-group col-span-2">
              <span>Ссылка на лендинг (Опционально) — мы спарсим смыслы</span>
              <input type="url" value={landingUrl} onChange={e => setLandingUrl(e.target.value)} placeholder="https://example.com" />
            </label>

            <div className="col-span-2">
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Ключевые преимущества (макс. 5)</span>
              {advantages.map((adv, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" value={adv} onChange={e => handleUpdateAdvantage(i, e.target.value)} placeholder={`Преимущество ${i+1}`} style={{ flex: 1 }} />
                  {advantages.length > 1 && (
                    <button type="button" onClick={() => handleRemoveAdvantage(i)} className="btn btn-secondary" style={{ padding: '0.6rem' }}><Trash2 size={16}/></button>
                  )}
                </div>
              ))}
              {advantages.length < 5 && (
                <button type="button" onClick={handleAddAdvantage} className="btn-text" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>+ Добавить преимущество</button>
              )}
            </div>

            <label className="form-group col-span-2">
              <span>Цена продукта</span>
              <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="Например: $300 или Бесплатно" />
            </label>
          </div>
        </section>

        {/* БЛОК B */}
        <section className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Users size={20} className="text-gradient" /> Блок B: Аудитория
          </h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <label className="form-group col-span-2">
              <span>Опишите клиента своими словами</span>
              <textarea rows={3} value={audienceDesc} onChange={e => setAudienceDesc(e.target.value)} placeholder="Люди, которые устали сводить таблицы в Excel..."></textarea>
            </label>

            <label className="form-group">
              <span>Пол</span>
              <select value={gender} onChange={e => setGender(e.target.value)}>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>

            <label className="form-group">
              <span>Профессия / Сфера</span>
              <input type="text" value={profession} onChange={e => setProfession(e.target.value)} placeholder="Маркетолог, Предприниматель..." />
            </label>

            <div className="form-group col-span-2">
              <span>Возраст</span>
              <div className="pill-group">
                {AGE_RANGES.map(age => (
                  <button type="button" key={age} onClick={() => toggleArrayItem(setAgeRange, ageRange, age)} className={`pill ${ageRange.includes(age) ? 'active' : ''}`}>{age}</button>
                ))}
              </div>
            </div>

            <label className="form-group">
              <span>Уровень дохода</span>
              <select value={income} onChange={e => setIncome(e.target.value)}>
                {INCOME_LEVELS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>

            <label className="form-group col-span-2">
              <span>Что клиент пробовал до вашего продукта (Опционально)</span>
              <input type="text" value={priorProducts} onChange={e => setPriorProducts(e.target.value)} placeholder="Курсы конкурентов, марафоны, пытались сами..." />
            </label>
          </div>
        </section>

        {/* БЛОК C */}
        <section className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Target size={20} className="text-gradient" /> Блок C: География и Язык
          </h3>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            <div className="form-group">
              <span>Страны (ГЕО) - <small>Нужно для поиска релевантных форумов для анализа</small></span>
              <div className="pill-group">
                {COUNTRIES.map(c => (
                  <button type="button" key={c} onClick={() => toggleArrayItem(setGeo, geo, c)} className={`pill ${geo.includes(c) ? 'active' : ''}`}>{c}</button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* БЛОК D */}
        <section className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <FileText size={20} className="text-gradient" /> Блок D: Дополнительный контекст
          </h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <label className="form-group col-span-2">
              <span>Есть ли уже запущенная реклама? (Заметки)</span>
              <textarea rows={3} value={existingAds} onChange={e => setExistingAds(e.target.value)} placeholder="Что сработало лучше всего? Что крутится сейчас?"></textarea>
            </label>

            <label className="form-group col-span-2">
              <span>Ключевые возражения (которые вы знаете)</span>
              <textarea rows={3} value={objections} onChange={e => setObjections(e.target.value)} placeholder="'Дорого', 'Нет времени', 'Не верю' - что говорят клиенты?"></textarea>
            </label>
          </div>
        </section>

        <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>
           Сгенерировать Аватары
        </button>

      </form>

      <style jsx>{`
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group span { font-size: 0.875rem; font-weight: 500; }
        .col-span-2 { grid-column: span 2; }
        input, select, textarea {
          width: 100%; padding: 0.75rem; border: 1px solid var(--border);
          border-radius: var(--radius-md); font-family: inherit; font-size: 0.875rem;
          background: var(--background); transition: border-color 0.2s;
        }
        input:focus, select:focus, textarea:focus {
          outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px var(--accent-light);
        }
        .pill-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pill {
          padding: 0.4rem 1rem; border-radius: 9999px; font-size: 0.875rem;
          background: var(--secondary); border: 1px solid var(--border);
          cursor: pointer; transition: all 0.2s ease;
        }
        .pill:hover { background: var(--secondary-hover); }
        .pill.active { background: var(--primary); color: white; border-color: var(--primary); }
      `}</style>
    </div>
  );
}
