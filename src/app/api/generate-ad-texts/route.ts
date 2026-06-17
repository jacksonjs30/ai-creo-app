import { NextRequest, NextResponse } from 'next/server';
import { PROMPTS } from '@/lib/prompts';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productName,
      productDescription,
      keyOutcome,
      avatarData,
      platform,
      language,
      globalRefinement,
      localRefinement,
      variantIndex,
      structureOverride,
    } = body;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    if (!avatarData) {
      return NextResponse.json({ error: 'avatarData is required' }, { status: 400 });
    }

    const prompt = PROMPTS.GENERATE_AD_TEXTS_PROMPT({
      productName: productName || 'Продукт',
      productDescription,
      keyOutcome,
      avatarData,
      platform: platform || 'meta',
      language: language || 'uk',
      globalRefinement,
      localRefinement,
      variantIndex,
      structureOverride,
    });

    console.log(
      '[generate-ad-texts] Generating for platform:',
      platform,
      '| Avatar:',
      avatarData?.segmentName,
      '| variantIndex:',
      variantIndex ?? 'all'
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            thinkingConfig: {
              thinkingBudget: 0, // Отключаем Thinking mode для скорости
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

    // Парсим JSON из ответа
    let parsed: { variants: any[] } = { variants: [] };

    try {
      // Убираем возможные markdown-обёртки ```json ... ```
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[generate-ad-texts] JSON parse error:', parseError);
      console.error('[generate-ad-texts] Raw response:', rawText.substring(0, 500));
      return NextResponse.json(
        { error: 'Не удалось распарсить ответ модели. Попробуйте ещё раз.' },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.variants) || parsed.variants.length === 0) {
      return NextResponse.json(
        { error: 'Модель вернула пустой список вариантов. Попробуйте ещё раз.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, variants: parsed.variants });
  } catch (error: any) {
    console.error('[generate-ad-texts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}
