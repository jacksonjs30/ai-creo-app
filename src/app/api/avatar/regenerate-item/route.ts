import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PROMPTS } from '@/lib/prompts';

export async function POST(request: Request) {
  try {
    const { action, sectionKey, existingItems, segmentName, briefContext } = await request.json();
    
    const apiKey = (
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
      process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || 
      ""
    ).trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return NextResponse.json({ error: 'API Key missing' }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });

    const prompt = PROMPTS.REGENERATE_ITEM(sectionKey, segmentName, briefContext, existingItems);
    
    const result = await model.generateContent(prompt);
    const resultText = result.response.text().trim();
    
    try {
      return NextResponse.json({ item: JSON.parse(resultText) });
    } catch (e) {
      console.error("JSON Parse Error in regenerate-item:", resultText);
      throw new Error("Не удалось разобрать ответ ИИ");
    }

  } catch (error: any) {
    console.error('Regenerate error:', error);
    const keyHint = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").substring(0, 5);
    return NextResponse.json({ error: `[Ошибка AI] ${error.message}. Ключ начинается на ${keyHint}...` }, { status: 500 });
  }
}
