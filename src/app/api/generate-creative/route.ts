import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { 
      type, 
      count, 
      styleDesc, 
      voiceStyle, 
      colorScheme, 
      briefContext, 
      avatars,
      platforms,
      placements
    } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Ты старший performance-маркетолог и креативный директор. Твоя задача — разработать ${count} ТЗ для рекламных креативов формата "${type}".
    
Данные продукта:
${JSON.stringify(briefContext, null, 2)}

Доступные сегменты аудитории (Используй их боли и JTBD для хуков):
${JSON.stringify(avatars, null, 2)}

Настройки форматирования:
${styleDesc ? ` - Стиль/Брендбук: ${styleDesc}` : ''}
${voiceStyle ? ` - Стиль голоса: ${voiceStyle}` : ''}

Создай ${count} уникальных креативов. Сделай их максимально конверсионными (Angle: Боль->Решение, Социальное доказательство, Трансформация).
Если тип "video", в поле "body" распиши раскадровку по секундам (0:00-0:02 хук и т.д.).
Если тип "image" или "meme", в поле "body" напиши точный текст для визуала и подпись.

Верни ответ в виде массиве JSON следующей структуры:
[
  {
    "id": 1, // уникальный id от 1 до ${count}
    "type": "${type}",
    "segment": "Название сегмента аудитории к которому обращаемся",
    "angle": "Какой подход используем (например, Боль -> Решение)",
    "hook": "Текст Хука (первые строки)",
    "body": "Сам сценарий или основной текст на баннере",
    "cta": "Призыв к действию",
    "colorScheme": { "bg": "${colorScheme.bg || '#1e293b'}", "text": "#ffffff", "accent": "${colorScheme.accent || '#3b82f6'}" }
  }
]
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let creatives = JSON.parse(text);

    return NextResponse.json({ creatives });
  } catch (error: any) {
    console.error('Error generating creatives:', error);
    
    // Временный mock-ответ на случай проблем с биллингом
    const mockCreatives = Array.from({length: 3}).map((_, i) => ({
      id: Date.now() + i,
      type: type || "image",
      segment: "Сегмент (Mock)",
      angle: "Тестовый угол",
      hook: "Это мок-данные из-за ошибки (скорее всего биллинг)",
      body: "Здесь будет настоящий текст, когда заработает API ключ. Ошибка: " + error.message,
      cta: "Попробовать",
      colorScheme: { bg: '#1e293b', text: '#ffffff', accent: '#3b82f6' }
    }));
    
    return NextResponse.json({ 
      error: error.message, 
      creatives: mockCreatives,
      isMock: true
    }, { status: 200 }); 
  }
}
