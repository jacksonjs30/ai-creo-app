import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rawApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, '');
    
    if (!apiKey) return NextResponse.json({ error: 'Ключ не найден' });

    // Используем чистый fetch к Google API, чтобы увидеть реальный ответ без посредника SDK
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    if (data.error) {
       return NextResponse.json({ 
         status: 'ОШИБКА GOOGLE', 
         error: data.error,
         apiKeyUsed: apiKey.substring(0, 8) + '...'
       });
    }

    // Извлекаем имена моделей
    const modelNames = data.models?.map((m: any) => m.name) || [];
    
    return NextResponse.json({ 
      status: 'СПИСОК МОДЕЛЕЙ ПОЛУЧЕН', 
      count: modelNames.length,
      availableModels: modelNames,
      fullResponse: data
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
