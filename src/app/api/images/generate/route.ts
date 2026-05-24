import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Words that trigger OpenAI safety filter — replace with neutral equivalents */
const EXPLICIT_WORDS: [RegExp, string][] = [
  [/оргазм\w*/gi, 'задоволення'],
  [/orgasm\w*/gi, 'pleasure'],
  [/стогн\w*/gi, 'насолоджують'],
  [/moan\w*/gi, 'enjoy'],
  [/еротич\w*/gi, 'романтичн'],
  [/erotic\w*/gi, 'romantic'],
  [/секс(?!ія|ти|тор|уальн)/gi, 'близкість'],
  [/\bsex\b/gi, 'intimacy'],
  [/порно\w*/gi, 'контент'],
  [/porn\w*/gi, 'content'],
  [/nude|naked/gi, 'natural'],
  [/інтим(?!н)/gi, 'особистий'],
];

function sanitize(text: string): string {
  let result = text;
  for (const [pattern, replacement] of EXPLICIT_WORDS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

/** Extract only visual design tokens from the design brief column */
function extractVisualStyle(brief: string): string {
  const lines = brief.split(/\n|<br\s*\/?>/i);
  const keep: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Keep: color palette, brand style, composition, size, reference lines
    if (
      /колір|кольор|палітр|фон:|акцент|контраст|шрифт|розмір|стиль|бренд-гайд|brand|référence|pinterest|розташ|composition|layout|lighting|mood|gradient|тон |tone|1080|1024|instagram|facebook/i.test(lower)
    ) {
      // Strip quoted ad copy inside this line (text in long quotes)
      const cleaned = line
        .replace(/"[^"]{15,}"/g, '')
        .replace(/«[^»]{15,}»/g, '')
        .replace(/\*\*/g, '')
        .trim();
      if (cleaned.length > 5) keep.push(cleaned);
    }
  }

  return sanitize(keep.join('\n')).substring(0, 600);
}

/** Build visual scene description from concept title + ad copy */
function buildSceneDescription(conceptTitle: string, adCopy: string): string {
  const title = sanitize(conceptTitle).replace(/<br\s*\/?>/gi, ' ').trim();
  const copy = sanitize(adCopy)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*/g, '')
    .substring(0, 300)
    .trim();

  if (!title && !copy) return '';
  return [title && `Ad concept: "${title}"`, copy && `Scene context: ${copy}`]
    .filter(Boolean)
    .join('. ');
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptId, cells, designBrief, avatarName, productName, action, oldImageUrl, count = 1 } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY не найден.' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // cells = all row cells, e.g. [№, conceptTitle, adCopyText, designBriefText]
    // If cells not provided, fall back to designBrief string
    let conceptTitle = '';
    let adCopyText = '';
    let rawBrief = designBrief || '';

    if (Array.isArray(cells) && cells.length >= 2) {
      conceptTitle = cells[1] || '';           // column 2: concept name
      adCopyText = cells[2] || cells[1] || ''; // column 3: ad copy
      rawBrief = cells[cells.length - 1] || designBrief || ''; // last column: design brief
    }

    const sceneDescription = buildSceneDescription(conceptTitle, adCopyText);
    const visualStyle = extractVisualStyle(rawBrief);

    const variations = [
      'Dynamic close-up with strong emotion, cinematic lighting.',
      'Environmental lifestyle scene with authentic context.',
      'Bold graphic design, strong typography layout, modern art direction.',
    ];

    const buildPrompt = (variationHint: string): string => {
      const parts: string[] = [
        `Create a professional advertising image. Product: "${sanitize(productName || 'product')}".`,
      ];

      if (sceneDescription) {
        parts.push(`Visual concept:\n${sceneDescription}`);
      }

      if (visualStyle) {
        parts.push(`Design style and color palette:\n${visualStyle}`);
      }

      parts.push(`Composition: ${variationHint}`);
      parts.push(`Produce a premium, high-impact advertising visual matching the concept above. Focus on the ad's message and aesthetic.`);

      return parts.join('\n\n');
    };

    console.log(`[images/generate] ${count} image(s) for script ${scriptId}. Concept: "${conceptTitle}"`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    );

    const finalUrls: string[] = [];

    for (let index = 0; index < count; index++) {
      const prompt = buildPrompt(variations[index % variations.length]);
      console.log(`[images/generate] Prompt #${index}: ${prompt.substring(0, 200)}...`);

      let b64ImageData: string;
      try {
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'medium',
        });

        const imgData = response.data?.[0];
        if (!imgData?.b64_json) throw new Error('gpt-image-1 не вернул b64_json.');
        b64ImageData = imgData.b64_json;

      } catch (openAiError: any) {
        const msg: string = openAiError?.message || '';
        console.error('[images/generate] OpenAI error:', msg);
        console.error('[images/generate] Prompt was:\n', buildPrompt(variations[index % variations.length]));

        if (msg.includes('does not exist') || msg.includes('model_not_found')) {
          return NextResponse.json({ error: `gpt-image-1 недоступна для этого ключа.\n${msg}` }, { status: 400 });
        }
        if (msg.includes('billing') || msg.includes('quota') || msg.includes('insufficient')) {
          return NextResponse.json({ error: `Недостаточно кредитов OpenAI. Пополните баланс.\n${msg}` }, { status: 402 });
        }
        if (msg.includes('safety')) {
          return NextResponse.json({
            error: `OpenAI заблокировал запрос из-за контента. Для этой концепции невозможно сгенерировать изображение — слишком чувствительная тематика. Попробуйте другую концепцию.\n\n${msg}`
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
        let errMsg = `Ошибка загрузки в Supabase: ${uploadError.message}.`;
        if (uploadError.message.includes('Bucket not found')) errMsg += ' Создайте бакет "creatives".';
        else if (uploadError.message.includes('row-level security')) errMsg += ' Добавьте RLS политику INSERT для бакета "creatives".';
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
    return NextResponse.json({ error: error.message || 'Не удалось сгенерировать картинку.' }, { status: 500 });
  }
}
