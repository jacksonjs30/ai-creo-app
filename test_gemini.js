const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: "hi" }] }],
    generationConfig: {
      temperature: 0.2,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  })
}).then(r => r.text()).then(console.log);
