import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
    process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || 
    ""
  ).trim().replace(/^["']|["']$/g, '');

  if (!apiKey) return NextResponse.json({ error: 'No API Key' });

  const results: any = {};
  const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.5-flash-8b"];
  const versions = ["v1", "v1beta"];

  for (const v of versions) {
    results[v] = {};
    for (const m of modelsToTest) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${m}?key=${apiKey}`);
        results[v][m] = {
          status: res.status,
          ok: res.ok,
          data: await res.json().catch(() => 'no-json')
        };
      } catch (e: any) {
        results[v][m] = { error: e.message };
      }
    }
  }

  return NextResponse.json(results);
}
