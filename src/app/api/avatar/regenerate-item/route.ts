import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: NextRequest) {
  let sectionKey = 'pains'; // default fallback
  try {
    const body = await req.json().catch(() => ({}));
    sectionKey = body.sectionKey || 'pains';
    const { existingItems, briefContext, segmentName, action } = body;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY === 'your_api_key_here') {
      throw new Error('API_KEY_MISSING');
    }

    const modelParams = {
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    };
    
    let model = genAI.getGenerativeModel(modelParams);

    let prompt = `Мы описываем целевую аудиторию для продукта.
Сегмент аудитории: ${segmentName}
Контекст продукта: ${JSON.stringify(briefContext)}

Задача: мы работаем над секцией "${sectionKey}".
Существующие пункты в этой секции: \n${JSON.stringify(existingItems, null, 2)}
`;

    if (action === 'replace' || action === 'add') {
      prompt += `Твоя задача — сгенерировать 1 НОВЫЙ пункт для этой секции, который по смыслу и частотности упоминания целевой аудиторией является следующим самым важным. 
Он НЕ ДОЛЖЕН повторять или быть синонимом существующих пунктов.

Верни ответ СТРОГО в формате JSON с 1 объектом (БЕЗ массива).
Пример структуры для "${sectionKey}":
- jtbd: { "job": "...", "context": "..." }
- pains: { "pain": "...", "frequency_rating": 4 }
- fears: { "fear": "...", "frequency_rating": 4 }
- objections: { "objection": "...", "howToRemove": "..." }
- behaviorMarkers: { "marker": "..." }
- cjm: { "scenario": "..." }
- motivations: { "motivation": "..." }
`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return NextResponse.json({ item: parsed });

  } catch (error: any) {
    console.error('API Error:', error.message);
    
    const mockResponse: Record<string, any> = {
      jtbd: { job: "Улучшить показатели (ИИ-аналог)", context: "В условиях нехватки времени" },
      pains: { pain: "Высокая стоимость привлечения (ИИ-аналог)", frequency_rating: 4 },
      fears: { fear: "Риск потерять данные (ИИ-аналог)", frequency_rating: 5 },
      objections: { objection: "Слишком сложно внедрять (ИИ-аналог)", howToRemove: "Покажем демо за 5 минут" },
      behaviorMarkers: { marker: "Ищет решение по ночам (ИИ-аналог)" },
      cjm: { scenario: "Увидел рекламу -> Загуглил отзывы -> Купил (ИИ-аналог)" },
      motivations: { motivation: "Стать лидером рынка (ИИ-аналог)" },
    };
    
    return NextResponse.json({ 
      error: error.message, 
      item: mockResponse[sectionKey] || { text: "Сгенерированный пункт (Mock)" },
      isMock: true
    }, { status: 200 }); 
  }
}

