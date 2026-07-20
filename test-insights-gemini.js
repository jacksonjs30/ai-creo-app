const fs = require('fs');
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

async function test() {
  const aggregatedData = JSON.parse(fs.readFileSync('analyze_result.json', 'utf-8'));
  const prompt = `
Ты — модуль “Обучение / Feedback Loop” в системе генерации и аналитики рекламных креативов.

Твоя задача:
1. Принимать структурированные данные по креативам и их метрикам из рекламных кабинетов за выбранный период.
2. Считать базовые показатели по проекту (компании) и по каждому креативу (если они не посчитаны или для проверки).
3. Определять или подтверждать статусы креативов (Winner / Loser / Neutral / Learning) внутри одной компании и выбранного периода.
4. Аггрегировать результаты по “смысловым связкам” (аватар, JTBD, боль, стадия CJM, формат).
5. Возвращать понятные подсказки, кого масштабировать, кого отключать и какие боли/углы работают лучше других.

Ты не управляешь рекламными кабинетами (не останавливаешь кампании сам), а только считаешь и объясняешь.

=== ВХОДНЫЕ ДАННЫЕ ===
${JSON.stringify(aggregatedData, null, 2)}

=== ФОРМАТ ВЫХОДНЫХ ДАННЫХ (ТОЛЬКО JSON) ===
Ты всегда отвечаешь валидным JSON, без лишнего текста, в структуре:

{
  "baseline": {
    "date_from": "2026-06-01",
    "date_to": "2026-06-07",
    "avg_CTR": 0.021,
    "avg_CPL": 6.5,
    "avg_CR_reg": 0.12
  },
  "creatives_summary": [
    {
      "id": "cr_1",
      "system_name": "AV1_pain_burnout_static_v1",
      "preview_url": "https://...",
      "created_at": "2026-05-28",
      "status": "winner | loser | neutral | learning",
      "metrics": {  },
      "deltas_vs_baseline": {
        "CTR": 0.35,
        "CPL": -0.3,
        "CR_reg": -0.25
      },
      "meta": {  },
      "explanation": "Креатив признан winner: CTR выше среднего на 35%, CPL ниже на 30%."
    }
  ],
  "angles_summary": [
    {
      "angle_key": "young_moms|выгорание|problem_aware|static",
      "label": "strong",
      "metrics": {  },
      "deltas_vs_baseline": {
        "CPL": -0.26,
        "CTR": 0.07
      },
      "explanation": "Боль «выгорание» для аватара young_moms даёт CPL на 26% ниже среднего по проекту."
    }
  ],
  "recommendations": {
    "winners_to_scale": [
      {
        "creative_id": "cr_1",
        "reason": "CPL на 30% ниже среднего, устойчивые регистрации",
        "suggested_actions": ["Сделать 5 визуальных мутаций с теми же смыслами"]
      }
    ],
    "losers_to_pause": [ ],
    "angles_to_focus": [ ],
    "angles_to_deprioritize": [ ]
  }
}

=== ПРАВИЛА ПОВЕДЕНИЯ ===
1. Всегда используй только переданные данные. 
2. В explanation пиши коротко и по существу: какие метрики и насколько отличаются от baseline, какие теги у этого креатива/угла, почему он попал в winner/loser.
3. Отвечай СТРОГО валидным JSON без markdown-оберток (\`\`\`json ... \`\`\`).
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response length:", text.length);
    console.log("Response text:", text.substring(0, 300) + "...\n" + text.substring(text.length - 300));
  } catch(e) {
    console.error(e);
  }
}
test();
