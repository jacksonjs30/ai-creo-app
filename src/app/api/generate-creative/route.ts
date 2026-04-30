import { NextRequest, NextResponse } from 'next/server';
import { PROMPTS } from '@/lib/prompts';

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, productName, avatarData, format, toneOfVoice, language, count, colors, focusDirection } = body;
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const prompt = PROMPTS.GENERATE_CREATIVES_PROMPT({
      productName,
      avatarData,
      format,
      toneOfVoice,
      language,
      count,
      colors,
      focusDirection
    });

    console.log('Generating creative script for format:', format, 'Avatar:', avatarData?.segmentName);

    // Вызываем Gemini напрямую через fetch, как мы делали для аватаров,
    // чтобы гарантированно отключить Thinking mode и избежать таймаутов
    const response = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.6,
          thinkingConfig: {
            thinkingBudget: 0 // ОТКЛЮЧАЕМ THINKING MODE
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
    }

    const resultData = await response.json();
    const text = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Генерируем уникальный ID для этого пака сценариев
    const scriptId = `script_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const scriptResult = {
      id: scriptId,
      projectId,
      productName,
      avatarName: avatarData?.segmentName || 'Неизвестный сегмент',
      format,
      toneOfVoice,
      language,
      colors,
      content: text,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ success: true, script: scriptResult });

  } catch (error: any) {
    console.error('Error generating creatives:', error);
    
    return NextResponse.json({ 
      error: error.message, 
    }, { status: 500 }); 
  }
}
