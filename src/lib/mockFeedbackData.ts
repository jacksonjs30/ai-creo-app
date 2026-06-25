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
    // --- WINNERS (Top 2 by CPL) ---
    {
      id: 'cr_1',
      external_ad_id: '11111',
      system_name: 'AV1_pain_burnout_static_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+1',
      created_at: '2026-05-28',
      meta: { avatar_id: 'young_moms', jtbd: ['выспаться'], pains: ['выгорание'], cjm_stage: 'problem_aware', format: 'static', hook_type: 'problem' },
      metrics_daily: [
        { date: '2026-06-01', spend: 40.0, impressions: 12000, clicks: 300, registrations: 30 }, // CPL = 1.33
      ],
    },
    {
      id: 'cr_4',
      external_ad_id: '44444',
      system_name: 'AV1_pain_burnout_video_v2',
      preview_url: 'https://placehold.co/100x100?text=CR+4',
      created_at: '2026-06-01',
      meta: { avatar_id: 'young_moms', jtbd: ['выспаться'], pains: ['выгорание'], cjm_stage: 'problem_aware', format: 'video', hook_type: 'problem' },
      metrics_daily: [
        { date: '2026-06-01', spend: 50.0, impressions: 15000, clicks: 400, registrations: 35 }, // CPL = 1.42
      ],
    },

    // --- NEUTRAL / MID-TIER ---
    {
      id: 'cr_5',
      external_ad_id: '55555',
      system_name: 'AV3_pain_stress_meme',
      preview_url: 'https://placehold.co/100x100?text=CR+5',
      created_at: '2026-06-02',
      meta: { avatar_id: 'students', jtbd: ['экзамен'], pains: ['стресс'], cjm_stage: 'unaware', format: 'meme', hook_type: 'humor' },
      metrics_daily: [
        { date: '2026-06-02', spend: 45.0, impressions: 10000, clicks: 200, registrations: 15 }, // CPL = 3.00
      ],
    },
    {
      id: 'cr_6',
      external_ad_id: '66666',
      system_name: 'AV2_pain_time_static_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+6',
      created_at: '2026-06-01',
      meta: { avatar_id: 'founders', jtbd: ['делегировать'], pains: ['нет времени'], cjm_stage: 'solution_aware', format: 'static', hook_type: 'benefit' },
      metrics_daily: [
        { date: '2026-06-02', spend: 35.0, impressions: 8000, clicks: 150, registrations: 10 }, // CPL = 3.50
      ],
    },
    {
      id: 'cr_7',
      external_ad_id: '77777',
      system_name: 'AV2_pain_time_video_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+7',
      created_at: '2026-06-01',
      meta: { avatar_id: 'founders', jtbd: ['делегировать'], pains: ['нет времени'], cjm_stage: 'solution_aware', format: 'video', hook_type: 'benefit' },
      metrics_daily: [
        { date: '2026-06-03', spend: 40.0, impressions: 9000, clicks: 170, registrations: 12 }, // CPL = 3.33
      ],
    },
    {
      id: 'cr_8',
      external_ad_id: '88888',
      system_name: 'AV3_pain_focus_static_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+8',
      created_at: '2026-06-02',
      meta: { avatar_id: 'students', jtbd: ['фокус'], pains: ['отвлечения'], cjm_stage: 'problem_aware', format: 'static', hook_type: 'problem' },
      metrics_daily: [
        { date: '2026-06-04', spend: 30.0, impressions: 7000, clicks: 120, registrations: 8 }, // CPL = 3.75
      ],
    },

    // --- LOSERS (High CPL) ---
    {
      id: 'cr_2',
      external_ad_id: '22222',
      system_name: 'AV1_pain_time_video_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+2',
      created_at: '2026-05-29',
      meta: { avatar_id: 'young_moms', jtbd: ['успевать'], pains: ['нехватка времени'], cjm_stage: 'solution_aware', format: 'video', hook_type: 'benefit' },
      metrics_daily: [
        { date: '2026-06-01', spend: 95.0, impressions: 29000, clicks: 380, registrations: 9 }, // CPL = 10.55
      ],
    },
    {
      id: 'cr_9',
      external_ad_id: '99999',
      system_name: 'AV2_pain_budget_video_v2',
      preview_url: 'https://placehold.co/100x100?text=CR+9',
      created_at: '2026-06-03',
      meta: { avatar_id: 'founders', jtbd: ['снизить CPL'], pains: ['слив бюджета'], cjm_stage: 'product_aware', format: 'video', hook_type: 'proof' },
      metrics_daily: [
        { date: '2026-06-03', spend: 80.0, impressions: 15000, clicks: 200, registrations: 6 }, // CPL = 13.33
      ],
    },
    {
      id: 'cr_10',
      external_ad_id: '10101',
      system_name: 'AV3_pain_stress_static_v2',
      preview_url: 'https://placehold.co/100x100?text=CR+10',
      created_at: '2026-06-04',
      meta: { avatar_id: 'students', jtbd: ['экзамен'], pains: ['паника'], cjm_stage: 'unaware', format: 'static', hook_type: 'fear' },
      metrics_daily: [
        { date: '2026-06-04', spend: 60.0, impressions: 12000, clicks: 150, registrations: 5 }, // CPL = 12.00
      ],
    },

    // --- LEARNING (Not enough data) ---
    {
      id: 'cr_3',
      external_ad_id: '33333',
      system_name: 'AV2_pain_budget_static_v1',
      preview_url: 'https://placehold.co/100x100?text=CR+3',
      created_at: '2026-06-05',
      meta: { avatar_id: 'founders', jtbd: ['снизить CPL'], pains: ['слив бюджета'], cjm_stage: 'product_aware', format: 'static', hook_type: 'proof' },
      metrics_daily: [
        { date: '2026-06-06', spend: 5.0, impressions: 500, clicks: 10, registrations: 1 }, // min_impressions not met
      ],
    },
  ],
};
