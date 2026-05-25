import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Sanitize ONLY explicitly sexual/violent words. Nothing else. */
function sanitize(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*/g, '')
    .replace(/оргазм\w*/gi, 'задоволення')
    .replace(/orgasm\w*/gi, 'pleasure')
    .replace(/стогн\w*/gi, 'насолоджуються')
    .replace(/moan\w*/gi, 'enjoy')
    .replace(/еротич\w*/gi, 'романтичн')
    .replace(/erotic\w*/gi, 'romantic')
    .replace(/\bсекс(?!ія|ти|тор|уальн)\b/gi, 'близькість')
    .replace(/\bsex\b/gi, 'intimacy')
    .replace(/порно\w*/gi, 'контент')
    .replace(/porn\w*/gi, 'content')
    .replace(/\bnude\b|\bnaked\b/gi, 'natural')
    .replace(/інтим(?!н)/gi, 'особистий')
    .trim();
}

/** Detect language of text for prompt instruction */
function detectLang(text: string): 'uk' | 'ru' | 'en' {
  const ukChars = (text.match(/[іїєґ]/gi) || []).length;
  const ruChars = (text.match(/[ёъыэ]/gi) || []).length;
  const latinWords = (text.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
  if (ukChars > 2) return 'uk';
  if (ruChars > 2) return 'ru';
  if (latinWords > 5) return 'en';
  return 'uk'; // default
}

/**
 * Single system instruction: generate a VISUAL BACKGROUND ONLY.
 * No text anywhere. Text is composited via CSS overlay.
 */
const VISUAL_BACKGROUND_INSTRUCTION = `You are a professional advertising photographer and art director.
Generate a PHOTOREALISTIC or CINEMATIC ILLUSTRATION for an advertising background image.

ABSOLUTE RULES — follow without any exception:
1. DO NOT render ANY text, letters, words, numbers, or inscriptions ANYWHERE in the image.
2. DO NOT write any Cyrillic, Latin, Arabic, or any other script.
3. DO NOT add logos, watermarks, price tags, badges, or UI elements.
4. The image MUST be a pure VISUAL SCENE: people, objects, environment, lighting, colors ONLY.
5. Text and headlines will be added on top separately by the design system.
6. Focus on: emotional storytelling, cinematic lighting, color palette, visual composition.`;


export async function POST(req: NextRequest) {
  try {
    const {
      projectId,
      scriptId,
      cells,        // string[] — full table row: [№, conceptTitle, adCopyText, designBrief]
      designBrief,  // fallback if cells not provided
      productName,
      action,
      oldImageUrl,
      count = 1
    } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY не найден.' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // ─── Assemble the full creative brief from row cells ────────────────────
    let fullBrief = '';
    let lang: 'uk' | 'ru' | 'en' = 'uk';

    if (Array.isArray(cells) && cells.length >= 2) {
      const parts: string[] = [];

      // Skip first cell if it's a plain number (row index column)
      const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;

      const cellLabels: Record<number, string> = {
        0: 'НАЗВА КОНЦЕПЦІЇ / ЗАГОЛОВОК',
        1: 'ТЕКСТ РЕКЛАМНОГО ОГОЛОШЕННЯ',
        2: 'ТЗ ДЛЯ ДИЗАЙНЕРА (ТОЧНЕ РОЗТАШУВАННЯ ТА ТЕКСТ)',
      };

      const dataSlice = cells.slice(startIdx);
      dataSlice.forEach((cell, i) => {
        const cleaned = sanitize(cell || '').trim();
        if (cleaned.length > 3) {
          const label = cellLabels[i] || `БЛОК ${i + 1}`;
          parts.push(`[${label}]\n${cleaned}`);
        }
      });

      fullBrief = parts.join('\n\n');
      lang = detectLang(fullBrief);
    } else if (designBrief) {
      fullBrief = sanitize(designBrief);
      lang = detectLang(fullBrief);
    }

    if (!fullBrief) {
      fullBrief = 'Professional advertising image, modern design, premium aesthetic.';
    }

    // ─── Assemble brief from cells with correct labels ────────────────────────
    if (Array.isArray(cells) && cells.length >= 2) {
      const parts: string[] = [];
      const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;
      const dataSlice = cells.slice(startIdx);
      lang = detectLang(dataSlice.join(' '));

      // Cell 0 after skip = concept name → CONTEXT ONLY, not text to render on image
      // Cell 1 = ad copy text → scene context
      // Cell 2+ = design brief → layout, colors, exact text to render
      const cellLabels: Record<number, string> = {
        0: lang === 'uk' ? 'СУТЬ КОНЦЕПЦІЇ (тільки візуальний сюжет)' : lang === 'ru' ? 'СУТЬ КОНЦЕПЦИИ (только визуальный сюжет)' : 'CONCEPT ESSENCE (visual plot only)',
        1: lang === 'uk' ? 'СЦЕНАРІЙ (тільки візуальна дія)' : lang === 'ru' ? 'СЦЕНАРИЙ (только визуальная действие)' : 'SCENARIO (visual action only)',
        2: lang === 'uk' ? 'ВІЗУАЛЬНЕ ТЗ ДЛЯ ДИЗАЙНЕРА (композиція, стиль, кольори - БЕЗ ТЕКСТУ)' : lang === 'ru' ? 'ВИЗУАЛЬНОЕ ТЗ ДЛЯ ДИЗАЙНЕРА (композиция, стиль, цвета - БЕЗ ТЕКСТА)' : 'VISUAL DESIGNER BRIEF (composition, style, colors - NO TEXT)',
      };

      dataSlice.forEach((cell, i) => {
        let cleaned = sanitize(cell || '').trim();
        
        // CRITICAL: Strip out any text that the model might try to render as letters.
        // Replace quoted text with a placeholder.
        cleaned = cleaned.replace(/["«„]([^"»”]+)["»”]/g, '[ТЕКСТ БУДЕ НАКЛАДЕНО ОКРЕМО]');
        
        // Strip text hint keywords
        cleaned = cleaned.replace(/(?:ЗАГОЛОВОК|Хук|CTA|Кнопка|Текст|Напис)[^:]*:/gi, '[ЕЛЕМЕНТ ДИЗАЙНУ]:');

        if (cleaned.length > 3) {
          const label = cellLabels[i] || `БЛОК ${i + 1}`;
          parts.push(`[${label}]\n${cleaned}`);
        }
      });

      fullBrief = parts.join('\n\n');
    }

    // ─── Compositional variations ─────────────────────────────────────────────
    const variations = [
      'Dynamic close-up portrait, cinematic lighting, emotional atmosphere, dark moody background.',
      'Real environment lifestyle scene, natural lighting, authentic human emotion.',
      'Graphic advertising scene, strong visual contrast, bold colors, dramatic composition.',
    ];

    const buildPrompt = (variationHint: string): string => {
      return [
        VISUAL_BACKGROUND_INSTRUCTION,
        '',
        `Product: "${sanitize(productName || '')}"`,
        '',
        '=== VISUAL BRIEF (describe ONLY the scene, people, colors, mood — NO text) ===',
        fullBrief,
        '=== END BRIEF ===',
        '',
        `Composition style: ${variationHint}`,
        '',
        'REMINDER: Absolutely NO text, letters, or writing anywhere in this image.',
      ].join('\n');
    };


    console.log(`[images/generate] lang=${lang}, count=${count}, script=${scriptId}`);
    console.log(`[images/generate] Brief (first 300 chars):\n${fullBrief.substring(0, 300)}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    );

    const finalUrls: string[] = [];

    for (let index = 0; index < count; index++) {
      const prompt = buildPrompt(variations[index % variations.length]);

      let b64ImageData: string;
      try {
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'medium', // low=$0.011 | medium=$0.042 | high=$0.167 per image
        });

        const imgData = response.data?.[0];
        if (!imgData?.b64_json) throw new Error('gpt-image-1 не вернул b64_json.');
        b64ImageData = imgData.b64_json;

      } catch (openAiError: any) {
        const msg: string = openAiError?.message || '';
        console.error('[images/generate] OpenAI error:', msg);

        if (msg.includes('does not exist') || msg.includes('model_not_found')) {
          return NextResponse.json({ error: `Модель gpt-image-1 недоступна. Перевірте ключ OpenAI.\n${msg}` }, { status: 400 });
        }
        if (msg.includes('billing') || msg.includes('quota') || msg.includes('insufficient')) {
          return NextResponse.json({ error: `Недостатньо кредитів OpenAI. Поповніть баланс.\n${msg}` }, { status: 402 });
        }
        if (msg.includes('safety')) {
          return NextResponse.json({
            error: `OpenAI заблокував запит: контент концепції несумісний з правилами генерації зображень.\nСпробуйте іншу концепцію або перефразуйте ТЗ.\n\n${msg}`
          }, { status: 400 });
        }
        throw openAiError;
      }

      const buffer = Buffer.from(b64ImageData, 'base64');
      const fileName = `${projectId}/${scriptId}/${Date.now()}_${index}.png`;

      const { error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

      if (uploadError) {
        let errMsg = `Supabase upload error: ${uploadError.message}.`;
        if (uploadError.message.includes('Bucket not found')) errMsg += ' Створіть бакет "creatives".';
        else if (uploadError.message.includes('row-level security')) errMsg += ' Додайте RLS INSERT для бакету "creatives".';
        throw new Error(errMsg);
      }

      const { data: pub } = supabase.storage.from('creatives').getPublicUrl(fileName);
      finalUrls.push(pub.publicUrl);
    }

    if (action === 'replace' && oldImageUrl?.includes('supabase.co')) {
      try {
        const path = oldImageUrl.split('/creatives/')[1];
        if (path) await supabase.storage.from('creatives').remove([path]);
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ success: true, urls: finalUrls, url: finalUrls[0] });

  } catch (error: any) {
    console.error('[images/generate] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Не вдалося згенерувати зображення.' }, { status: 500 });
  }
}
