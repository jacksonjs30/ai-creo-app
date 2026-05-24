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

/** Language-specific instruction snippets */
const LANG_INSTRUCTIONS = {
  uk: `ВАЖЛИВО: Весь текст на зображенні має бути виключно УКРАЇНСЬКОЮ мовою.
ВАЖЛИВО: Використовуй ТОЧНО текстові рядки, вказані у ТЗ нижче. Не перекладай, не змінюй, не перефразовуй жодного слова.
ВАЖЛИВО: Весь текст повинен повністю вміщуватися всередині зображення без обрізання.
ВАЖЛИВО: Дотримуйся точного розташування елементів, кольорів та стилю, описаних у ТЗ.`,

  ru: `ВАЖНО: Весь текст на изображении должен быть ТОЛЬКО на РУССКОМ языке.
ВАЖНО: Используй ТОЧНО текстовые строки, указанные в ТЗ ниже. Не переводи, не меняй, не перефразируй.
ВАЖНО: Весь текст должен полностью помещаться внутри изображения без обрезания.
ВАЖНО: Соблюдай точное расположение элементов, цвета и стиль из ТЗ.`,

  en: `IMPORTANT: All text in the image must be in ENGLISH only.
IMPORTANT: Use EXACTLY the text strings specified in the brief below. Do not translate, alter, or paraphrase any word.
IMPORTANT: All text must fit completely within the image without clipping.
IMPORTANT: Follow exactly the element placement, colors, and style from the brief.`,
};

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

    // ─── Language-aware instructions ─────────────────────────────────────────
    const langInstructions = LANG_INSTRUCTIONS[lang];

    // ─── Compositional variations ────────────────────────────────────────────
    const variations = [
      lang === 'uk' ? 'Крупний план з сильною емоцією, кінематографічне освітлення, жирна типографіка.' :
      lang === 'ru' ? 'Крупный план с сильной эмоцией, кинематографическое освещение, жирная типографика.' :
      'Dynamic close-up with strong emotion, cinematic lighting, bold typography.',

      lang === 'uk' ? 'Сцена реального середовища, автентичний контекст, природне освітлення.' :
      lang === 'ru' ? 'Сцена реальной среды, аутентичный контекст, естественное освещение.' :
      'Real environment lifestyle scene, authentic context, natural lighting.',

      lang === 'uk' ? 'Графічний дизайн плакату, виразна візуальна ієрархія, сміливі кольори.' :
      lang === 'ru' ? 'Графический дизайн плаката, выразительная визуальная иерархия, смелые цвета.' :
      'Graphic poster design, strong visual hierarchy, bold colors.',
    ];

    const buildPrompt = (variationHint: string): string => {
      const productLabel = lang === 'uk' ? 'Продукт' : lang === 'ru' ? 'Продукт' : 'Product';
      const composLabel = lang === 'uk' ? 'Стиль композиції' : lang === 'ru' ? 'Стиль композиции' : 'Composition style';
      const briefHeader = lang === 'uk' ? 'ПОВНЕ ТЗ РЕКЛАМНОГО КРЕАТИВУ (виконуй ТОЧНО)' :
                          lang === 'ru' ? 'ПОЛНОЕ ТЗ РЕКЛАМНОГО КРЕАТИВА (выполнять ТОЧНО)' :
                          'FULL CREATIVE BRIEF (follow EXACTLY)';

      return [
        langInstructions,
        '',
        `${productLabel}: "${sanitize(productName || '')}"`,
        '',
        `=== ${briefHeader} ===`,
        fullBrief,
        `=== КІНЕЦЬ ТЗ ===`,
        '',
        `${composLabel}: ${variationHint}`,
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
          quality: 'high',   // upgraded to high for text accuracy
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
