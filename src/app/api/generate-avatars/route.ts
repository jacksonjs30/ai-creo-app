import { NextResponse } from 'next/server';
import { PROMPTS } from '@/lib/prompts';

export const maxDuration = 300;

// Прямой вызов Gemini REST API.
// ВАЖНО: responseSchema намеренно НЕ используется — со сложной вложенной схемой
// gemini-2.5-flash уходит в думающий режим на 4+ минуты. Без схемы: 20-40 сек.
// Промпты уже задают точный формат JSON — модель его соблюдает без принуждения.
async function callGemini(apiKey: string, prompt: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json'
      // Без responseSchema — быстрая генерация свободного JSON
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  
  // Извлекаем JSON из ответа (модель иногда добавляет ```json ... ```)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in response');
  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { regenerateOne, avatars: existingAvatars, brief: nestedBrief, ...topLevelBrief } = body;
    const brief = nestedBrief || topLevelBrief;
    
    const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
    if (!apiKey) return NextResponse.json({ error: 'API Key missing' }, { status: 500 });

    const url = new URL(request.url);
    const step = url.searchParams.get('step');
    const segmentToResearch = url.searchParams.get('segment');

    // 1. Схема для списка сегментов
    const segmentsSchema = {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              segmentName: { type: 'string' },
              summary: { type: 'string' }
            }
          }
        }
      },
      required: ['segments']
    };

    // 2. Схема для детального исследования одного сегмента
    const researchSchema = {
      type: 'object',
      properties: {
        segmentName: { type: 'string' },
        summary: { type: 'string' },
        portrait: { type: 'string' },
        jtbd: {
          type: 'array',
          items: {
            type: 'object',
            properties: { job: { type: 'string' }, context: { type: 'string' } }
          }
        },
        outcomes: {
          type: 'object',
          properties: {
            mainPromise: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: { outcome: { type: 'string' }, explanation: { type: 'string' } }
              }
            }
          }
        },
        pains: {
          type: 'array',
          items: {
            type: 'object',
            properties: { pain: { type: 'string' }, context: { type: 'string' }, frequency_rating: { type: 'number' } }
          }
        },
        fears: {
          type: 'array',
          items: {
            type: 'object',
            properties: { fear: { type: 'string' }, context: { type: 'string' }, frequency_rating: { type: 'number' } }
          }
        },
        symptoms: {
          type: 'array',
          items: {
            type: 'object',
            properties: { symptom: { type: 'string' }, context: { type: 'string' }, frequency_rating: { type: 'number' } }
          }
        },
        behaviorMarkers: {
          type: 'array',
          items: {
            type: 'object',
            properties: { marker: { type: 'string' }, context: { type: 'string' }, frequency_rating: { type: 'number' } }
          }
        },
        motivations: {
          type: 'array',
          items: {
            type: 'object',
            properties: { motivation: { type: 'string' }, context: { type: 'string' }, frequency_rating: { type: 'number' } }
          }
        },
        objections: {
          type: 'array',
          items: {
            type: 'object',
            properties: { objection: { type: 'string' }, context: { type: 'string' }, howToRemove: { type: 'string' }, frequency_rating: { type: 'number' } }
          }
        },
        cjm: {
          type: 'array',
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, scenario: { type: 'string' } }
          }
        }
      },
      required: ['segmentName', 'summary', 'portrait', 'jtbd', 'outcomes', 'pains', 'fears', 'symptoms', 'behaviorMarkers', 'motivations', 'objections', 'cjm']
    };

    // РЕЖИМ 1: Только идентификация сегментов
    if (step === 'identify') {
      console.log('Step: Identify segments');
      const segmentsPrompt = PROMPTS.IDENTIFY_SEGMENTS(brief);
      const data = await callGemini(apiKey, segmentsPrompt);
      return NextResponse.json(data);
    }

    // РЕЖИМ 2: Исследование конкретного сегмента (параллельные вызовы с фронта)
    if (step === 'research' && segmentToResearch) {
      console.log('Step: Research specific segment:', segmentToResearch);
      const segmentObj = { segmentName: segmentToResearch, summary: '' };
      const researchPrompt = PROMPTS.RESEARCH_SEGMENT(segmentObj, brief);
      
      try {
        const data = await callGemini(apiKey, researchPrompt);
        return NextResponse.json(data);
      } catch (err: any) {
        console.error(`Research error for ${segmentToResearch}:`, err);
        return NextResponse.json({ segmentName: segmentToResearch, error: true, message: err.message });
      }
    }

    // РЕЖИМ 3: Регенерация одного сегмента (из дашборда)
    if (regenerateOne) {
      const existingNames = (existingAvatars || []).map((a: any) => a.segmentName);
      const singleSegmentPrompt = `На основе брифа продукта "${brief.productName}", предложи 1 НОВЫЙ сегмент ЦА, отличный от: ${existingNames.join(', ')}. Верни JSON: { "segments": [{ "segmentName": "...", "summary": "..." }] }`;
      const segData = await callGemini(apiKey, singleSegmentPrompt);
      const segments = segData.segments || [];

      const avatars = await Promise.all(segments.map(async (segment: any) => {
        try {
          const researchPrompt = PROMPTS.RESEARCH_SEGMENT(segment, brief);
          return await callGemini(apiKey, researchPrompt);
        } catch (err) {
          return { ...segment, error: true };
        }
      }));

      return NextResponse.json({ avatars });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error: any) {
    console.error('Generation failure:', error);
    return NextResponse.json({ error: `[Ошибка ИИ] ${error.message}` }, { status: 500 });
  }
}
