'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { Settings, Users, BrainCircuit, Activity, ShieldAlert, ChevronRight, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';

// Мок данные аватаров для MVP
const mockAvatars = [
  {
    id: 1,
    segmentName: "Маркетологи / Офисные работники / Молодожены и т.д",
    summary: "Устали копировать данные вручную. Хотят уйти вовремя. Много задач и т.д.",
    stats: { pains: 5, fears: 3, objections: 2 },
    portrait: "Аналитик, 25-35 лет. Глаза красные от таблиц. Боится потерять клиента из-за 'разъехавшихся' данных. Готов платить за сервис, если он реально автоматом соберет всё воедино и покажет красивый график для босса."
  },
  {
    id: 2,
    segmentName: "Владельцы малого бизнеса (SMB)",
    summary: "Нуждаются в контроле цифр без звонков бухгалтеру.",
    stats: { pains: 4, fears: 4, objections: 3 },
    portrait: "Собственник, 35-50 лет. Нет времени на учебу. Много делегирует, но теряет контроль финансов. Ищет 'волшебную кнопку' для ясности."
  }
];

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  // Использование нового React API для params в серверных/клиентских компонентах
  const { id } = use(params);
  const router = useRouter();

  const [avatars, setAvatars] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      if (!id || id === 'temp-id') {
        const stored = localStorage.getItem('tempGeneratedAvatars');
        if (stored) setAvatars(JSON.parse(stored));
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/projects?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          const proj = data.project || data.product || data;
          if (proj && proj.avatars) {
            setAvatars(proj.avatars);
          }
        }
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  const handleProceedToGenerate = () => {
    setIsNavigating(true);
    router.push(`/project/${id}/generate`);
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyAllToExcel = () => {
    if (avatars.length === 0) return;

    // Определяем максимальное количество CJM среди всех аватаров
    const maxCJMs = Math.max(...avatars.map(a => (a.cjm || []).length));

    // Определяем строки (параметры)
    const rowLabels = [
      "СЕГМЕНТ",
      "Название",
      "Резюме",
      "Портрет",
      "JTBD (Задачи)",
      "Боли",
      "Страхи",
      "Симптомы",
      "Маркеры поведения",
      "Мотивации",
      "Возражения",
    ];

    // Добавляем строки для CJM
    for (let i = 0; i < maxCJMs; i++) {
      rowLabels.push(`CJM Сценарий ${i + 1}`);
    }

    const formatList = (list: any[], labelKey: string) => {
      if (!list || !Array.isArray(list)) return "";
      return list.map((item, i) => {
        const rating = item.frequency_rating ? ` [${item.frequency_rating}/10]` : "";
        return `${i + 1}. ${item[labelKey]}${rating}\n${item.context ? `(${item.context})` : ""}`;
      }).join('\n\n');
    };

    // Генерируем данные для каждого ряда
    const finalRows = rowLabels.map((label, rowIndex) => {
      const rowData = [label]; // Первый столбец - название параметра

      avatars.forEach(a => {
        let value = "";
        if (rowIndex === 0) value = `Сегмент #${avatars.indexOf(a) + 1}`;
        else if (rowIndex === 1) value = a.segmentName || "";
        else if (rowIndex === 2) value = a.summary || "";
        else if (rowIndex === 3) value = a.portrait || "";
        else if (rowIndex === 4) value = formatList(a.jtbd, 'job');
        else if (rowIndex === 5) value = formatList(a.pains, 'pain');
        else if (rowIndex === 6) value = formatList(a.fears, 'fear');
        else if (rowIndex === 7) value = formatList(a.symptoms, 'symptom');
        else if (rowIndex === 8) value = formatList(a.behaviorMarkers, 'marker');
        else if (rowIndex === 9) value = formatList(a.motivations, 'motivation');
        else if (rowIndex === 10) value = formatList(a.objections, 'objection');
        else {
          // Это строки CJM
          const cjmIndex = rowIndex - 11;
          const cjm = a.cjm && a.cjm[cjmIndex];
          if (cjm) {
            value = `${cjm.title ? `**${cjm.title}**\n` : ""}${cjm.scenario}`;
          }
        }
        rowData.push(value);
      });

      return rowData.map(cell => `"${cell.replace(/"/g, '""')}"`).join('\t');
    });

    const tsvContent = finalRows.join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      <BackButton fallbackUrl="/" />

      <div className="flex-between mb-8" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Аватары проекта</h1>
          <p className="page-subtitle">Мы провели исследование и выделили {avatars.length} сегмента аудитории</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleCopyAllToExcel}
            className={`btn ${isCopied ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {isCopied ? 'Скопировано!' : 'Для таблиц (Excel/Sheets)'}
          </button>

          <button
            onClick={handleProceedToGenerate}
            disabled={isNavigating}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isNavigating ? <RefreshCw size={18} className="animate-spin" /> : <Settings size={18} />}
            {isNavigating ? 'Загрузка...' : 'Перейти к генерации креативов'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {avatars.map((avatar, idx) => (
          <div key={avatar.id || idx} className="card" style={{ padding: '2rem' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>Сегмент #{idx + 1}</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{avatar.segmentName}</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{avatar.summary || (avatar.jtbd && avatar.jtbd[0]?.job) || ''}</p>
              </div>
              <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', minWidth: 220 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Статистика аватара</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {[
                    { label: 'JTBD', key: 'jtbd', color: '#3b82f6' },
                    { label: 'Боли', key: 'pains', color: '#f59e0b' },
                    { label: 'Страхи', key: 'fears', color: '#ef4444' },
                    { label: 'Возражения', key: 'objections', color: '#8b5cf6' },
                    { label: 'Маркеры', key: 'behaviorMarkers', color: '#06b6d4' },
                    { label: 'CJM', key: 'cjm', color: '#10b981' },
                    { label: 'Мотивации', key: 'motivations', color: '#f97316' },
                  ].map(({ label, key, color }) => {
                    const count = avatar[key]?.length || avatar.stats?.[key] || 0;
                    return (
                      <div key={key} className="tooltip-container" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 700, color, fontSize: '1rem', minWidth: 20 }}>{count}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Users size={18} className="text-gradient" /> Психологический портрет
              </h4>
              <p style={{ lineHeight: 1.6, color: 'var(--foreground)' }}>
                {avatar.portrait}
              </p>
              <div style={{ marginTop: '1rem' }}>
                <Link
                  href={`/project/${id}/avatar/${idx}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Показать полный JTBD и сценарии CJM <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
