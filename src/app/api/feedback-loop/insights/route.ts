import { NextRequest, NextResponse } from 'next/server';
import { PROMPTS } from '@/lib/prompts';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aggregatedData } = body;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    if (!aggregatedData) {
      return NextResponse.json({ error: 'aggregatedData is required' }, { status: 400 });
    }

    const prompt = PROMPTS.FEEDBACK_LOOP_ANALYSIS_PROMPT({
      jsonPayload: JSON.stringify(aggregatedData, null, 2)
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Low temp for analytical consistency
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
    }

    const resultData = await response.json();
    const rawText: string = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed = null;
    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[feedback-loop-insights] JSON parse error:', parseError);
      console.error('[feedback-loop-insights] Raw response:', rawText.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse Gemini response as JSON.' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('[feedback-loop-insights] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
