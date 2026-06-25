import { NextRequest, NextResponse } from 'next/server';
import { mockFeedbackData } from '@/lib/mockFeedbackData';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, dateFrom, dateTo, minImpressions = 1000, minClicks = 50, minRegistrations = 3 } = body;

    // 1. Fetch data (mock for now)
    const data = mockFeedbackData;
    
    // 2. Filter daily metrics within date range
    const fromDate = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toDate = dateTo ? new Date(dateTo).getTime() : Infinity;

    const creativesWithAggregatedMetrics = data.creatives.map(creative => {
      let total_spend = 0;
      let total_impressions = 0;
      let total_clicks = 0;
      let total_regs = 0;

      const filteredMetrics = creative.metrics_daily.filter(m => {
        const t = new Date(m.date).getTime();
        return t >= fromDate && t <= toDate;
      });

      filteredMetrics.forEach(m => {
        total_spend += m.spend;
        total_impressions += m.impressions;
        total_clicks += m.clicks;
        total_regs += m.registrations;
      });

      const CTR = total_impressions > 0 ? total_clicks / total_impressions : null;
      const CPC = total_clicks > 0 ? total_spend / total_clicks : null;
      const CR_reg = total_clicks > 0 ? total_regs / total_clicks : null;
      const CPL = total_regs > 0 ? total_spend / total_regs : null;

      const isEligible = total_impressions >= minImpressions && 
                         total_clicks >= minClicks && 
                         total_regs >= minRegistrations;

      return {
        ...creative,
        aggregated: {
          spend: total_spend,
          impressions: total_impressions,
          clicks: total_clicks,
          registrations: total_regs,
          CTR,
          CPC,
          CR_reg,
          CPL
        },
        isEligible
      };
    });

    // 3. Calculate Project Baseline (only from Eligible creatives)
    let project_total_spend = 0;
    let project_total_impressions = 0;
    let project_total_clicks = 0;
    let project_total_regs = 0;

    const eligibleCreatives = creativesWithAggregatedMetrics.filter(c => c.isEligible);

    eligibleCreatives.forEach(c => {
      project_total_spend += c.aggregated.spend;
      project_total_impressions += c.aggregated.impressions;
      project_total_clicks += c.aggregated.clicks;
      project_total_regs += c.aggregated.registrations;
    });

    const avg_CTR = project_total_impressions > 0 ? project_total_clicks / project_total_impressions : null;
    const avg_CPL = project_total_regs > 0 ? project_total_spend / project_total_regs : null;
    const avg_CR_reg = project_total_clicks > 0 ? project_total_regs / project_total_clicks : null;

    const baseline = {
      date_from: dateFrom,
      date_to: dateTo,
      avg_CTR,
      avg_CPL,
      avg_CR_reg
    };

    // 4. Assign Statuses and Deltas using Ranking (Top 10% min 2 winners)
    
    // First, map everyone to calculate deltas
    const creativesWithDeltas = creativesWithAggregatedMetrics.map(c => {
      let deltas = { CTR: null as number | null, CPL: null as number | null, CR_reg: null as number | null };
      if (c.aggregated.CTR !== null && avg_CTR) deltas.CTR = (c.aggregated.CTR / avg_CTR) - 1;
      if (c.aggregated.CPL !== null && avg_CPL) deltas.CPL = (c.aggregated.CPL / avg_CPL) - 1;
      if (c.aggregated.CR_reg !== null && avg_CR_reg) deltas.CR_reg = (c.aggregated.CR_reg / avg_CR_reg) - 1;
      return { ...c, deltas };
    });

    // Rank Eligible Creatives by CPL (lower is better, assuming they all have CPL if they are eligible)
    const eligibleForRanking = creativesWithDeltas.filter(c => c.isEligible).sort((a, b) => {
      const cplA = a.aggregated.CPL ?? Infinity;
      const cplB = b.aggregated.CPL ?? Infinity;
      return cplA - cplB;
    });

    const targetWinnersCount = Math.min(
      eligibleForRanking.length, 
      Math.max(2, Math.ceil(eligibleForRanking.length * 0.1))
    );

    // Assign statuses based on rank
    const winnerIds = new Set(eligibleForRanking.slice(0, targetWinnersCount).map(c => c.id));

    const finalCreatives = creativesWithDeltas.map(c => {
      let status = 'learning';
      
      if (c.aggregated.impressions > 0 && c.isEligible) {
        if (winnerIds.has(c.id)) {
          status = 'winner';
        } else {
          // Check for loser condition on the remaining
          if (c.aggregated.CTR !== null && avg_CTR && c.aggregated.CPL !== null && avg_CPL) {
            if (c.aggregated.CPL >= avg_CPL * 1.2 || c.aggregated.CTR <= avg_CTR * 0.8) {
              status = 'loser';
            } else {
              status = 'neutral';
            }
          } else {
            status = 'neutral';
          }
        }
      }

      return {
        id: c.id,
        system_name: c.system_name,
        preview_url: c.preview_url,
        created_at: c.created_at,
        status,
        metrics: c.aggregated,
        deltas_vs_baseline: c.deltas,
        meta: c.meta,
      };
    });

    // 5. Aggregate by Angle
    const anglesMap = new Map<string, any>();
    
    eligibleCreatives.forEach(c => {
      // Create Angle Key: avatar_id | main_pain | cjm_stage | format
      const mainPain = c.meta.pains[0] || 'none';
      const angleKey = `${c.meta.avatar_id}|${mainPain}|${c.meta.cjm_stage}|${c.meta.format}`;
      
      if (!anglesMap.has(angleKey)) {
        anglesMap.set(angleKey, {
          angle_key: angleKey,
          metrics: { spend: 0, impressions: 0, clicks: 0, registrations: 0 },
        });
      }
      
      const angle = anglesMap.get(angleKey);
      angle.metrics.spend += c.aggregated.spend;
      angle.metrics.impressions += c.aggregated.impressions;
      angle.metrics.clicks += c.aggregated.clicks;
      angle.metrics.registrations += c.aggregated.registrations;
    });

    const anglesSummary = Array.from(anglesMap.values()).map(angle => {
      const CTR = angle.metrics.impressions > 0 ? angle.metrics.clicks / angle.metrics.impressions : null;
      const CPL = angle.metrics.registrations > 0 ? angle.metrics.spend / angle.metrics.registrations : null;
      const CR_reg = angle.metrics.clicks > 0 ? angle.metrics.registrations / angle.metrics.clicks : null;
      
      let deltas = { CTR: null as number | null, CPL: null as number | null };
      if (CTR !== null && avg_CTR) deltas.CTR = (CTR / avg_CTR) - 1;
      if (CPL !== null && avg_CPL) deltas.CPL = (CPL / avg_CPL) - 1;

      let label = 'neutral';
      if (CPL !== null && avg_CPL) {
         if (CPL <= avg_CPL * 0.8) label = 'strong';
         else if (CPL >= avg_CPL * 1.2) label = 'weak';
      }

      return {
        angle_key: angle.angle_key,
        label,
        metrics: { ...angle.metrics, CTR, CPL, CR_reg },
        deltas_vs_baseline: deltas
      };
    });

    return NextResponse.json({
      baseline,
      creatives_summary: finalCreatives,
      angles_summary: anglesSummary
    });
  } catch (error: any) {
    console.error('[Feedback Loop API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
