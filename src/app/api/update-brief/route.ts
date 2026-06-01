import { NextRequest, NextResponse } from 'next/server';
import { PROMPTS } from '@/lib/prompts';

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { newText, oldBrief, format, avatarName, productName } = body;
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const prompt = `
Ты — опытный креативный директор. 
Пользователь изменил текстовую часть креатива (хук, текст). Твоя задача — обновить "Бриф для дизайнера" (визуальную композицию), чтобы он соответствовал новому тексту, но ПРИ ЭТОМ сохранял исходную общую визуальную концепцию, цвета, стиль и компоновку, если они не противоречат новому тексту.

ПРОДУКТ: ${productName}
СЕГМЕНТ ЦА: ${avatarName}
ФОРМАТ: ${format}

НОВЫЙ ТЕКСТ КРЕАТИВА:
"""
${newText}
"""

СТАРЫЙ БРИФ ДЛЯ ДИЗАЙНЕРА:
"""
${oldBrief}
"""

ПРАВИЛА:
1. Выведи ТОЛЬКО обновленный бриф для дизайнера. Никаких вводных слов, пояснений или markdown форматирования вне самого брифа.
2. Сохрани оригинальное форматирование брифа (списки, жирный шрифт и т.д.).
3. Обнови только те части, которые зависят от текста (например, описание заголовка/хука, размещение текста, акценты), сохраняя стиль.
    `;

    console.log('Updating design brief for format:', format, 'Avatar:', avatarName);

    // Call Gemini directly
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
          temperature: 0.7,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
    }

    const resultData = await response.json();
    const updatedBrief = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ success: true, updatedBrief: updatedBrief.trim() });

  } catch (error: any) {
    console.error('Error updating brief:', error);
    return NextResponse.json({ 
      error: error.message, 
    }, { status: 500 }); 
  }
}
