export const mockFeedbackData = {
  project: {
    id: 'proj_123',
    name: 'Sleep Drops UA',
  },
  filter: {
    campaign_ids: ['camp_1', 'camp_2'],
    date_from: '2026-06-01',
    date_to: '2026-06-07',
  },
  creatives: [
    {
      id: 'cr_1',
      external_ad_id: '1234567890',
      system_name: 'AV1_pain_burnout_static_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+1',
      created_at: '2026-05-28',
      meta: {
        avatar_id: 'young_moms',
        jtbd: ['выспаться и успевать'],
        pains: ['выгорание', 'хаос с креативами'],
        cjm_stage: 'problem_aware',
        format: 'static',
        hook_type: 'problem',
      },
      metrics_daily: [
        {
          date: '2026-06-01',
          spend: 25.3,
          impressions: 8200,
          clicks: 180,
          registrations: 12,
        },
        {
          date: '2026-06-02',
          spend: 30.1,
          impressions: 9500,
          clicks: 210,
          registrations: 15,
        },
        {
          date: '2026-06-03',
          spend: 20.0,
          impressions: 6000,
          clicks: 130,
          registrations: 8,
        },
      ], // total: spend 75.4, imp 23700, clicks 520, regs 35. CPL = 2.15, CTR = 2.19%
    },
    {
      id: 'cr_2',
      external_ad_id: '0987654321',
      system_name: 'AV1_pain_time_video_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+2',
      created_at: '2026-05-29',
      meta: {
        avatar_id: 'young_moms',
        jtbd: ['успевать работать'],
        pains: ['нехватка времени'],
        cjm_stage: 'solution_aware',
        format: 'video',
        hook_type: 'benefit',
      },
      metrics_daily: [
        {
          date: '2026-06-01',
          spend: 50.0,
          impressions: 15000,
          clicks: 200,
          registrations: 5,
        },
        {
          date: '2026-06-02',
          spend: 45.0,
          impressions: 14000,
          clicks: 180,
          registrations: 4,
        },
      ], // total: spend 95, imp 29000, clicks 380, regs 9. CPL = 10.55, CTR = 1.31% (Likely LOSER)
    },
    {
      id: 'cr_3',
      external_ad_id: '1122334455',
      system_name: 'AV2_pain_budget_static_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+3',
      created_at: '2026-06-05',
      meta: {
        avatar_id: 'founders',
        jtbd: ['снизить CPL'],
        pains: ['слив бюджета'],
        cjm_stage: 'product_aware',
        format: 'static',
        hook_type: 'proof',
      },
      metrics_daily: [
        {
          date: '2026-06-06',
          spend: 5.0,
          impressions: 500,
          clicks: 10,
          registrations: 1,
        },
      ], // total: spend 5, imp 500, clicks 10, regs 1. (Likely LEARNING / Not enough data)
    },
    {
      id: 'cr_4',
      external_ad_id: '5544332211',
      system_name: 'AV1_pain_burnout_video_v2',
      preview_url: 'https://placehold.co/100x100?text=CR+4',
      created_at: '2026-06-01',
      meta: {
        avatar_id: 'young_moms',
        jtbd: ['выспаться и успевать'],
        pains: ['выгорание'],
        cjm_stage: 'problem_aware',
        format: 'video',
        hook_type: 'problem',
      },
      metrics_daily: [
        {
          date: '2026-06-01',
          spend: 40.0,
          impressions: 12000,
          clicks: 300,
          registrations: 25,
        },
        {
          date: '2026-06-02',
          spend: 38.0,
          impressions: 11500,
          clicks: 290,
          registrations: 22,
        },
      ], // total: spend 78.0, imp 23500, clicks 590, regs 47. CPL = 1.66, CTR = 2.51% (Likely WINNER)
    },
    {
      id: 'cr_5',
      external_ad_id: '9988776655',
      system_name: 'AV3_pain_stress_meme',
      preview_url: 'https://placehold.co/100x100?text=CR+5',
      created_at: '2026-06-02',
      meta: {
        avatar_id: 'students',
        jtbd: ['сдать экзамен'],
        pains: ['стресс', 'паника'],
        cjm_stage: 'unaware',
        format: 'meme',
        hook_type: 'humor',
      },
      metrics_daily: [
        {
          date: '2026-06-02',
          spend: 25.0,
          impressions: 10000,
          clicks: 220,
          registrations: 8,
        },
        {
          date: '2026-06-03',
          spend: 22.0,
          impressions: 9000,
          clicks: 190,
          registrations: 7,
        },
      ], // total: spend 47.0, imp 19000, clicks 410, regs 15. CPL = 3.13, CTR = 2.15% (Likely NEUTRAL)
    }
  ],
};
