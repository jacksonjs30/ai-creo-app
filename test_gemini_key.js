require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const data = {
  baseline: { date_from: '2026-06-01', date_to: '2026-06-07', avg_CTR: 0.021 },
  creatives_summary: [{ id: '1', status: 'winner' }]
};

fetch(`https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: "Return exactly {\"status\": \"ok\"}" }] }],
    generationConfig: {
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 }
    }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
