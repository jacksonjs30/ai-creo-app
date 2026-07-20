const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) { console.error("No API KEY"); process.exit(1); }

async function test() {
  const prompt = "Please return exactly this JSON: {\"test\": 123}";
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
    console.log("Response:", text);
  } catch(e) {
    console.error(e);
  }
}
test();
