import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
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
ВАЖЛИВО: Дотримуйся точного розташування елементів, кольорів та стилю, описаних у ТЗ.
ВАЖЛИВО: Зображення повинно мати СУЦІЛЬНИЙ, НЕПРОЗОРИЙ фон (наприклад, суцільний темний або кольоровий фон, відповідний дизайну). Будь-яка прозорість або альфа-канали суворо ЗАБОРОНЕНІ. Усі пікселі мають бути повністю непрозорими.`,

  ru: `ВАЖНО: Весь текст на изображении должен быть ТОЛЬКО на РУССКОМ языке.
ВАЖНО: Используй ТОЧНО текстовые строки, указанные в ТЗ ниже. Не переводи, не меняй, не перефразируй.
ВАЖНО: Весь текст должен полностью помещаться внутри изображения без обрезания.
ВАЖНО: Соблюдай точное расположение элементов, цвета и стиль из ТЗ.
ВАЖНО: Изображение должно иметь СПЛОШНОЙ, НЕПРОЗРАЧНЫЙ фон (например, сплошной темный или цветной фон, соответствующий дизайну). Любая прозрачность или альфа-каналы строго ЗАПРЕЩЕНЫ. Все пиксели должны быть полностью непрозрачными.`,

  en: `IMPORTANT: All text in the image must be in ENGLISH only.
IMPORTANT: Use EXACTLY the text strings specified in the brief below. Do not translate, alter, or paraphrase any word.
IMPORTANT: All text must fit completely within the image without clipping.
IMPORTANT: Follow exactly the element placement, colors, and style from the brief.
IMPORTANT: The image must have a SOLID, OPAQUE background (e.g. solid dark or colored background matching the design). Any transparency or alpha channels are strictly FORBIDDEN. All pixels must be fully opaque.`,
};

const CYRILLIC_HINT = {
  uk: '\nОСОБЛИВО ВАЖЛИВО — ТЕКСТ НА ЗОБРАЖЕННІ: Рендери кожну літеру кирилиці ТОЧНО та ЧІТКО. Жодних нечитабельних символів, жодних замін кириличних букв латиницею або псевдографікою. Весь текст має бути написаний стандартними кириличними літерами українського алфавіту.',
  ru: '\nОСОБЕННО ВАЖНО — ТЕКСТ НА ИЗОБРАЖЕНИИ: Рендери каждую букву кириллицы ТОЧНО и ЧЁТКО. Никаких нечитаемых символов, никаких замен кириллических букв латиницей или псевдографикой. Весь текст должен быть написан стандартными кириллическими буквами.',
  en: '\nIMPORTANT — TEXT ON THE IMAGE: Render each letter accurately and clearly. All text must be readable and written in clean typography.',
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
      count = 1,
      quality = 'high', // Default to high quality to ensure sharper rendering
      userNotes,
      logoUrl,
      logoPosition = 'BR',
      enhancePrompt = false
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
        0: 'ВНУТРІШНЯ НАЗВА КОНЦЕПЦІЇ (ДЛЯ ДОВІДКИ — НЕ МАЛЮВАТИ НА КАРТИНЦІ)',
        1: 'ТЕКСТ РЕКЛАМНОГО ОГОЛОШЕННЯ (БРАТИ ТЕКСТ ТІЛЬКИ ЗВІДСИ)',
        2: 'ТЗ ДЛЯ ДИЗАЙНЕРА (ВІЗУАЛЬНИЙ СТИЛЬ ТА КОМПОЗИЦІЯ)',
      };

      const dataSlice = cells.slice(startIdx);
      dataSlice.forEach((cell, i) => {
        const cleaned = sanitize(cell || '').trim();
        if (cleaned.length > 3) {
          const label = cellLabels[i] || `БЛОК ${i + 1}`;
          if (i === 0) {
            parts.push(`[${label}]\nНЕ МАЛЮВАТИ НА КАРТИНЦІ: ${cleaned}`);
          } else {
            parts.push(`[${label}]\n${cleaned}`);
          }
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

    // Detect and extract [NO_PEOPLE] tag
    const hasNoPeopleTag = fullBrief.includes('[NO_PEOPLE]');
    if (hasNoPeopleTag) {
      fullBrief = fullBrief.replace(/\[NO_PEOPLE\]/gi, '').trim();
    }

    const langInstructions = LANG_INSTRUCTIONS[lang];
    const cyrillicHint = CYRILLIC_HINT[lang];

    // ─── Compositional variations ─────────────────────────────────────────────
    const variations = [
      lang === 'uk' ? 'Крупний план, кінематографічне освітлення, виразна типографіка.' :
      lang === 'ru' ? 'Крупный план, кинематографическое освещение, выразительная типографика.' :
      'Dynamic close-up, cinematic lighting, bold typography.',

      lang === 'uk' ? 'Сцена реального середовища, природне освітлення, автентичний контекст.' :
      lang === 'ru' ? 'Сцена реальной среды, естественное освещение, аутентичный контекст.' :
      'Real environment lifestyle scene, natural lighting.',

      lang === 'uk' ? 'Графічний плакат, виразна ієрархія, сміливі кольори.' :
      lang === 'ru' ? 'Графический плакат, выразительная иерархия, смелые цвета.' :
      'Graphic poster, strong visual hierarchy, bold colors.',
    ];

    const buildPrompt = (variationHint: string): string => {
      const productLabel = lang === 'uk' ? 'Продукт' : lang === 'ru' ? 'Продукт' : 'Product';
      const composLabel  = lang === 'uk' ? 'Стиль композиції' : lang === 'ru' ? 'Стиль композиции' : 'Composition style';
      const briefHeader  = lang === 'uk' ? 'ПОВНЕ ТЗ РЕКЛАМНОГО КРЕАТИВУ' :
                           lang === 'ru' ? 'ПОЛНОЕ ТЗ РЕКЛАМНОГО КРЕАТИВА' :
                           'FULL CREATIVE BRIEF';

      const strictRules = lang === 'uk'
        ? 'УВАГА: Текст із блоку "ВНУТРІШНЯ НАЗВА КОНЦЕПЦІЇ" є суто довідковим. Категорично заборонено малювати його на зображенні. На зображенні потрібно писати ТІЛЬКИ ті текстові фрази, які вказані у блоці "ТЕКСТ РЕКЛАМНОГО ОГОЛОШЕННЯ". Блок "ТЗ ДЛЯ ДИЗАЙНЕРА" використовуйте виключно для розуміння візуального стилю, кольорів, фону та композиції.'
        : 'ВНИМАНИЕ: Текст из блока "ВНУТРЕННЕЕ НАЗВАНИЕ КОНЦЕПЦИИ" является чисто справочным. Категорически запрещено рисовать его на изображении. На изображении нужно писать ТОЛЬКО те текстовые фразы, которые указаны в блоке "ТЕКСТ РЕКЛАМНОГО ОГОЛОШЕННЯ". Блок "ТЗ ДЛЯ ДИЗАЙНЕРА" используйте исключительно для понимания визуального стиля, цветов, фона и композиции.';

      const promptParts = [
        langInstructions + cyrillicHint,
        '',
        strictRules,
        '',
        `${productLabel}: "${sanitize(productName || '')}"`,
        ''
      ];

      if (hasNoPeopleTag) {
        promptParts.push(
          '=== CRITICAL RULE ===',
          'DO NOT DRAW ANY HUMANS, FACES, PEOPLE, OR BODY PARTS IN THIS IMAGE. NO CHARACTERS ALLOWED.',
          'DRAW ONLY EMPTY OBJECTS, INTERFACES, OR ENVIRONMENTS.',
          '=====================',
          ''
        );
      }

      // Add user notes BEFORE the brief with maximum priority to override default branding colors or compositions
      if (userNotes && userNotes.trim().length > 0) {
        const userNotesHeader = lang === 'uk'
          ? '🔴 КРИТИЧНЕ ПРАВИЛО ВІД КОРИСТУВАЧА (АБСОЛЮТНИЙ ПРІОРИТЕТ):'
          : '🔴 КРИТИЧЕСКОЕ ПРАВИЛО ОТ ПОЛЬЗОВАТЕЛЯ (АБСОЛЮТНЫЙ ПРИОРИТЕТ):';
        const overrideText = lang === 'uk'
          ? 'ЦІ ВКАЗІВКИ СКАСОВУЮТЬ БУДЬ-ЯКІ СУПЕРЕЧЛИВІ ДАНІ З ТЗ. ЯКЩО Є КОНФЛІКТ (наприклад, інший вік, фон чи стать) — ІГНОРУЙ ТЗ І РОБИ ТІЛЬКИ ТАК, ЯК ВКАЗАНО ТУТ:'
          : 'ЭТИ УКАЗАНИЯ ОТМЕНЯЮТ ЛЮБЫЕ ПРОТИВОРЕЧИВЫЕ ДАННЫЕ ИЗ ТЗ. ЕСЛИ ЕСТЬ КОНФЛИКТ (например другой возраст, фон или пол) — ИГНОРИРУЙ ТЗ И ДЕЛАЙ ТОЛЬКО ТАК, КАК УКАЗАНО ЗДЕСЬ:';
        promptParts.push(
          `=== ${userNotesHeader} ===`,
          overrideText,
          `"${sanitize(userNotes.trim())}"`,
          `========================================================================================`,
          ''
        );
      }

      promptParts.push(
        `=== ${briefHeader} ===`,
        fullBrief,
        `=== КІНЕЦЬ ТЗ ===`,
        '',
        `${composLabel}: ${variationHint}`
      );

      return promptParts.join('\n');
    };


    console.log(`[images/generate] lang=${lang}, count=${count}, script=${scriptId}, quality=${quality}`);
    console.log(`[images/generate] Brief (first 300 chars):\n${fullBrief.substring(0, 300)}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    );

    const finalUrls: string[] = [];

    for (let index = 0; index < count; index++) {
      let prompt = buildPrompt(variations[index % variations.length]);

      if (enhancePrompt) {
        try {
          const enhanceSysPrompt = `You are an expert prompt engineer for AI image generation. Your goal is to take a raw advertising brief and rewrite it into a highly detailed, structured, and descriptive prompt in English that will generate a premium, high-converting ad banner.

The raw brief always contains:
– Product and audience context
– Short text fragments in the target language
– A requested CREATIVE FORMAT (for example: "DIRECT SALE", "REAL-PHOTO", or other format labels)

Your job is to:
1) Respect the requested format
2) Enforce a clean layout and strong visual hierarchy
3) Keep all text short, readable and safely inside the frame
4) NEVER translate or change the language of the given text

==================================================
FORMAT LOGIC (CRITICAL)
==================================================

Carefully read the brief and detect the requested format.

🟢 IF THE FORMAT IS "DIRECT SALE" (or the brief explicitly says it is a direct sales banner):

Use a strict split-layout with marketing text and bullets.

LAYOUT:
– LEFT SIDE (about 60% width): All marketing text — headline, subheadline, bullet points, CTA button.
– RIGHT SIDE (about 40% width): Visual content — realistic product mockups (laptop or smartphone showing the UI), cinematic 3D product imagery, or abstract thematic illustration matching the product.

TEXT BLOCKS:
– MAIN HEADLINE: 1–2 lines, large bold sans-serif font at the top-left. This is the main promise or result for the audience.
– SUBHEADLINE: 1 short line under the headline in smaller text. Describes what the product does or who it is for.

BULLETS (ONLY FOR DIRECT SALE FORMAT — MANDATORY HERE):
Randomly choose ONE of the two layouts:
  • Option A (VERTICAL): A vertical list of 3–4 bullet points directly under the subheadline. Each bullet has a small icon on the left and short text on the right, stacked vertically.
  • Option B (HORIZONTAL): A horizontal strip at the bottom with 3–4 compact items in a row. Each item has a small icon above and a short label below.

Place the bullets inside a modern UI card or clearly separated area:
  – semi-transparent rounded rectangle, glassmorphism card, or subtle bordered box,
  – visually separated from the background but not stronger than the headline and CTA.

CTA:
– A large solid button in the lower part of the left side (bottom-left area).
– Short, strong text inside (up to 2 words).
– Optionally add a small promo badge or sticker near the button (for example: "-20%", "NEW").

🟢 IF THE FORMAT IS "REAL-PHOTO":

Use a full-bleed cinematic photo layout.

LAYOUT:
– Do NOT use a split layout.
– Do NOT show bullet points.
– The entire banner is a realistic lifestyle or UGC-style photo that clearly matches the product and audience (people using the product, workplace scenes, daily life, etc.).

TEXT:
– Use at most ONE main text block, placed either at the top-left or at the bottom-left, not both.
– This block can contain a headline and a very short supporting line or CTA, grouped together.
– Place the text on top of the photo with strong contrast and readability.
– IMPORTANT PADDING: Start the text block well inside the canvas (at least 15% padding from the left, right, top, and bottom edges). Never let text touch the border.

🟢 IF THE FORMAT IS ANY OTHER (not "DIRECT SALE" and not "REAL-PHOTO"):

– Follow any layout hints given in the brief.
– DO NOT invent bullet lists unless the brief explicitly asks for bullets.
– Keep a clear visual hierarchy: main headline > supporting line > CTA.
– Use a composition that fits the described format.
– IMPORTANT PADDING: Ensure all text is placed with a generous margin (at least 15% from all edges of the canvas). Text must never touch or get cropped by the borders.

==================================================
VISUAL STYLE & SAFE MARGINS (CRITICAL FOR DALL-E)
==================================================

– Premium advertising look: clean typography, clear hierarchy, strong contrast.
– No generic stock-photo clichés, no random glowing lines, no thin frames around the whole banner.
– SAFE MARGINS (MANDATORY TO PREVENT CROPPING):
  • You MUST explicitly instruct the image generator to use a "zoomed out", "wide-angle shot", with "generous negative space around all edges".
  • Specify that there is an "invisible inner frame" 15% away from the edges, and all text MUST be kept strictly inside this inner frame.
  • Tell the image generator: "NO TEXT OR ICONS MAY TOUCH OR BE CROPPED BY THE CANVAS BORDERS. Leave plenty of empty padding on all four sides."

==================================================
EXACT TEXT RULES (CRITICAL – DO NOT TRANSLATE)
==================================================

– You MUST keep the EXACT LANGUAGE of all text fragments provided in the brief.
  If the brief text is in English, keep English.
  If it is in Ukrainian or Russian, keep Ukrainian/Russian.
  DO NOT TRANSLATE OR REWRITE THE LANGUAGE.

– Enforce very short text:
  • Headline: maximum 3 words.
  • Subheadline: maximum 4 words.
  • Bullet labels (for DIRECT SALE format only): maximum 2–3 words each.
  • CTA button: maximum 2 words.
  • Badge (optional): for example "-20%".

– Every piece of text MUST be quoted exactly and clearly instructed. For example:
  "Render the text exactly as '...' with perfect spelling and kerning."

==================================================
OUTPUT
==================================================

Produce ONE long, coherent, visually descriptive prompt in English for the image model.

The prompt MUST:
– Explicitly describe the chosen layout (split versus full-bleed),
– Respect the format logic above (bullets ONLY for DIRECT SALE; NO bullets for REAL-PHOTO),
– CRITICAL: Explicitly include exact keywords like "zoomed out composition", "wide-angle", "generous negative space around all edges", and "all text is strictly confined to the inner center, away from borders" to force the image model to prevent text cropping.
– Emphasize the main message, supporting text, and CTA as the primary focal points of the banner.
– IF THE RAW BRIEF CONTAINS A "🔴 КРИТИЧЕСКОЕ ПРАВИЛО ОТ ПОЛЬЗОВАТЕЛЯ" OR "🔴 КРИТИЧНЕ ПРАВИЛО ВІД КОРИСТУВАЧА" BLOCK, YOU MUST INTEGRATE IT INTO YOUR FINAL PROMPT WITH ABSOLUTE MAXIMUM PRIORITY OVERRIDING ANY OTHER DEFAULT STYLES OR COLORS.`;
          
          const enhanceRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: enhanceSysPrompt },
              { role: 'user', content: `Here is the raw ad brief that needs to be enhanced and structured for AI image generation:\n\n${prompt}` }
            ],
            temperature: 0.7,
            max_tokens: 800,
          });
          
          let enhancedPromptText = enhanceRes.choices[0]?.message?.content?.trim();
          if (enhancedPromptText) {
            prompt = enhancedPromptText;
            // Re-inject the user's strict rule at the very end of the enhanced prompt to ensure DALL-E doesn't miss it
            if (userNotes && userNotes.trim().length > 0) {
              prompt += `\n\nCRITICAL USER INSTRUCTION (OVERRIDE ALL PREVIOUS STYLE LOGIC): ${sanitize(userNotes.trim())}`;
            }
          }
        } catch (enhanceErr) {
          console.error('Error enhancing prompt:', enhanceErr);
          // Fallback to original prompt if enhancement fails
        }
      }

      if (prompt.length > 3900) {
        prompt = prompt.substring(0, 3900) + '...';
      }

      let buffer: any;
      try {
        const ideogramApiKey = process.env.IDEOGRAM_API_KEY;
        if (!ideogramApiKey) {
          throw new Error('IDEOGRAM_API_KEY не найден.');
        }

        const ideogramRes = await fetch('https://api.ideogram.ai/v1/ideogram-v4/generate', {
          method: 'POST',
          headers: {
            'Api-Key': ideogramApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text_prompt: prompt,
            aspect_ratio: '1:1', // По умолчанию используем 1:1, как и было 1024x1024
          })
        });

        if (!ideogramRes.ok) {
          const errText = await ideogramRes.text();
          throw new Error(`Ideogram API Error: ${ideogramRes.status} ${errText}`);
        }

        const ideogramData = await ideogramRes.json();
        const imageUrl = ideogramData?.data?.[0]?.url;

        if (!imageUrl) {
          throw new Error('Ideogram API не вернул URL картинки.');
        }

        const imageFetchRes = await fetch(imageUrl);
        if (!imageFetchRes.ok) {
          throw new Error('Не удалось скачать сгенерированную картинку от Ideogram.');
        }

        const arrayBuf = await imageFetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      } catch (err: any) {
        console.error('[images/generate] Ideogram error:', err);
        return NextResponse.json({ error: err.message || 'Ошибка генерации изображения Ideogram' }, { status: 500 });
      }

      if (logoUrl) {
        try {
          const logoRes = await fetch(logoUrl);
          if (logoRes.ok) {
            const logoArrayBuffer = await logoRes.arrayBuffer();
            const logoBuffer = Buffer.from(logoArrayBuffer);
            
            // Resize logo
            const resizedLogo = await sharp(logoBuffer)
              .resize({ width: 180, height: 180, fit: 'inside' })
              .toBuffer();

            const imageMeta = await sharp(buffer).metadata();
            const { width = 1024, height = 1024 } = imageMeta;
            
            const padding = 40;
            const logoMeta = await sharp(resizedLogo).metadata();
            const lw = logoMeta.width || 180;
            const lh = logoMeta.height || 180;

            let top = padding;
            let left = padding;
            
            if (logoPosition === 'TR') {
               left = width - lw - padding;
            } else if (logoPosition === 'BL') {
               top = height - lh - padding;
            } else if (logoPosition === 'BR') {
               top = height - lh - padding;
               left = width - lw - padding;
            }

            buffer = (await sharp(buffer)
              .composite([{ input: resizedLogo, top: Math.round(top), left: Math.round(left) }])
              .png()
              .toBuffer()) as unknown as Buffer;
          }
        } catch (logoErr) {
          console.error('Failed to overlay logo:', logoErr);
        }
      }

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
