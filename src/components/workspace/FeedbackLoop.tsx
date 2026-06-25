'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  HelpCircle,
  AlertCircle,
  Info,
  BrainCircuit
} from 'lucide-react';

interface FeedbackLoopProps {
  id: string;
}

export default function FeedbackLoop({ id }: FeedbackLoopProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  const [hasSelectedCampaign, setHasSelectedCampaign] = useState(false);

  useEffect(() => {
    // Initial fetch removed. Wait for user to select campaign and click load.
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback-loop/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          dateFrom: '2026-06-01',
          dateTo: '2026-06-07'
        })
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setHasSelectedCampaign(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!data) return;
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/feedback-loop/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggregatedData: data })
      });
      if (res.ok) {
        const json = await res.json();
        setInsights(json);
      } else {
        alert('Ошибка генерации инсайтов');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  const winnersCount = data?.creatives_summary?.filter((c: any) => c.status === 'winner').length || 0;
  const losersCount = data?.creatives_summary?.filter((c: any) => c.status === 'loser').length || 0;
  
  return (
    <div className="feedback-loop">
      {/* Filters (Mocked) */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Период</label>
          <select style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option>Последние 7 дней (01 Июн - 07 Июн)</option>
            <option>Последние 30 дней</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Кампании</label>
          <select style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option>Все активные кампании</option>
            <option>camp_1, camp_2</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            className="btn btn-primary"
            onClick={fetchData}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', height: '42px' }}
          >
            Применить
          </button>
        </div>
      </div>

      {!hasSelectedCampaign ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <Activity size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Выберите кампании для анализа</h3>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            Чтобы рассчитать Baseline (средний результат), выберите одну или несколько рекламных кампаний с одинаковой целью.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Banner */}
      <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>Итоги периода (Baseline)</h3>
          <p style={{ color: '#15803d', margin: 0, fontWeight: 500 }}>
            Средний CPL: <strong style={{fontSize: '1.1rem'}}>${data.baseline?.avg_CPL?.toFixed(2) || 'N/A'}</strong> | 
            Средний CTR: <strong style={{fontSize: '1.1rem'}}>{(data.baseline?.avg_CTR * 100).toFixed(2) || 'N/A'}%</strong> | 
            Средний CR: <strong style={{fontSize: '1.1rem'}}>{(data.baseline?.avg_CR_reg * 100).toFixed(2) || 'N/A'}%</strong>
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: '#22c55e', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 700 }}>{winnersCount} Winners</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: '#ef4444', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '99px', fontWeight: 700 }}>{losersCount} Losers</div>
            </div>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={generateInsights}
          disabled={insightsLoading}
          style={{ background: '#166534', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '12px' }}
        >
          {insightsLoading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
          Сгенерировать AI-инсайты
        </button>
      </div>

      {/* AI Recommendations */}
      {insights && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrainCircuit color="#3b82f6" /> AI Рекомендации
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Scale */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Кого масштабировать</h4>
              {insights.recommendations?.winners_to_scale?.length > 0 ? (
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#334155' }}>
                  {insights.recommendations.winners_to_scale.map((w: any, i: number) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>
                      <strong>{w.creative_id}</strong>: {w.reason}
                      {w.suggested_actions && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Действия: {w.suggested_actions.join(', ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Нет явных кандидатов на масштабирование.</p>}
            </div>

            {/* Pause */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Кого отключить</h4>
              {insights.recommendations?.losers_to_pause?.length > 0 ? (
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#334155' }}>
                  {insights.recommendations.losers_to_pause.map((l: any, i: number) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>
                      <strong>{l.creative_id}</strong>: {l.reason}
                    </li>
                  ))}
                </ul>
              ) : <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Нет креативов для срочного отключения.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Creatives Table */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Креативы за период</h3>
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Креатив</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Смыслы (Angle)</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Метрики</th>
              <th style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.creatives_summary?.map((c: any) => {
              
              const statusColor = 
                c.status === 'winner' ? '#16a34a' :
                c.status === 'loser' ? '#dc2626' :
                c.status === 'neutral' ? '#eab308' : '#94a3b8';
                
              const statusBg = 
                c.status === 'winner' ? '#dcfce7' :
                c.status === 'loser' ? '#fee2e2' :
                c.status === 'neutral' ? '#fef9c3' : '#f1f5f9';

              const StatusIcon = 
                c.status === 'winner' ? TrendingUp :
                c.status === 'loser' ? TrendingDown :
                c.status === 'neutral' ? Minus : HelpCircle;

              // Extract insight for this specific creative if available
              const insightExp = insights?.creatives_summary?.find((ic: any) => ic.id === c.id)?.explanation;

              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {/* Creative Info */}
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <img src={c.preview_url} alt="preview" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.25rem' }}>{c.system_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {c.external_ad_id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.created_at}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Meta / Angle */}
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>{c.meta?.avatar_id}</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#fce7f3', color: '#be185d', borderRadius: '4px', fontWeight: 600 }}>{c.meta?.pains?.[0]}</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#f3f4f6', color: '#374151', borderRadius: '4px', fontWeight: 600 }}>{c.meta?.format}</span>
                    </div>
                  </td>

                  {/* Metrics */}
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div><strong>Impr:</strong> {c.metrics?.impressions}</div>
                      <div><strong>Clicks:</strong> {c.metrics?.clicks}</div>
                      <div><strong>Spend:</strong> ${c.metrics?.spend?.toFixed(2)}</div>
                      <div><strong>Regs:</strong> {c.metrics?.registrations}</div>
                      <div><strong>CPC:</strong> ${c.metrics?.CPC?.toFixed(2) || '-'}</div>
                      <div><strong>CPL:</strong> ${c.metrics?.CPL?.toFixed(2) || '-'}</div>
                      <div><strong>CTR:</strong> {c.metrics?.CTR ? (c.metrics.CTR * 100).toFixed(2) + '%' : '-'}</div>
                      <div><strong>CR:</strong> {c.metrics?.CR_reg ? (c.metrics.CR_reg * 100).toFixed(2) + '%' : '-'}</div>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      background: statusBg, color: statusColor, padding: '0.4rem 0.8rem', borderRadius: '99px',
                      fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize'
                    }}>
                      <StatusIcon size={16} />
                      {c.status}
                    </div>
                    {insightExp && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                        <Info size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        {insightExp}
                      </div>
                    )}
                    {!insightExp && c.status === 'learning' && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        Недостаточно данных для оценки.
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>
  );
}
