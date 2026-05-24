import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Sanitize ONLY explicitly sexual/violent words — replace with neutral equivalents.
 * DO NOT remove marketing/business/creative language.
 */
function sanitize(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')  // convert HTML line breaks to newlines
    .replace(/\*\*/g, '')           // remove markdown bold
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

export async function POST(req: NextRequest) {
  try {
    const {
      projectId,
      scriptId,
      cells,          // string[] — full table row: [№, conceptTitle, adCopy, designBrief]
      designBrief,    // fallback if cells not provided
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

    // ─── Build the full creative brief from the row cells ───────────────────
    let fullCreativeBrief = '';

    if (Array.isArray(cells) && cells.length >= 2) {
      const parts: string[] = [];

      // Skip first cell if it's just a number (row index)
      const startIdx = /^\d+$/.test((cells[0] || '').trim()) ? 1 : 0;

      const labels = ['Назва концепції', 'Текст сценарію', 'ТЗ для дизайнера'];
      cells.slice(startIdx).forEach((cell, i) => {
        const cleaned = sanitize(cell || '').trim();
        if (cleaned.length > 3) {
          const label = labels[i] || `Частина ${i + 1}`;
          parts.push(`${label}:\n${cleaned}`);
        }
      });

      fullCreativeBrief = parts.join('\n\n');
    } else if (designBrief) {
      fullCreativeBrief = sanitize(designBrief);
    }

    if (!fullCreativeBrief) {
      fullCreativeBrief = 'Professional advertising image, modern design, premium aesthetic.';
    }

    // ─── 3 compositional variations ─────────────────────────────────────────
    const variations = [
      'Close-up dynamic composition, bold typography visible, cinematic lighting.',
      'Wide lifestyle/environment scene, authentic real-world context.',
      'Flat design / graphic poster style, strong visual hierarchy, bold colors.',
    ];

    const buildPrompt = (variationHint: string): string => {
      return [
        `Create a professional advertising image for the product "${sanitize(productName || 'product')}".`,
        `Use the following creative brief EXACTLY — it defines the concept, scene, text, colors, and layout for this specific ad:`,
        `---`,
        fullCreativeBrief,
        `---`,
        `Compositional approach: ${variationHint}`,
        `Generate a premium, high-quality visual that accurately reflects the brief above. The image must be thematically relevant to the ad concept described.`,
      ].join('\n\n');
    };

    console.log(`[images/generate] Generating ${count} images for: ${scriptId}`);
    console.log(`[images/generate] Brief preview: ${fullCreativeBrief.substring(0, 200)}...`);

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
          quality: 'medium',
        });

        const imgData = response.data?.[0];
        if (!imgData?.b64_json) throw new Error('gpt-image-1 не вернул b64_json.');
        b64ImageData = imgData.b64_json;

      } catch (openAiError: any) {
        const msg: string = openAiError?.message || '';
        console.error('[images/generate] OpenAI error:', msg);

        if (msg.includes('does not exist') || msg.includes('model_not_found')) {
          return NextResponse.json({ error: `Модель gpt-image-1 недоступна. Проверьте ключ OpenAI.\n${msg}` }, { status: 400 });
        }
        if (msg.includes('billing') || msg.includes('quota') || msg.includes('insufficient')) {
          return NextResponse.json({ error: `Недостаточно кредитов OpenAI. Пополните баланс.\n${msg}` }, { status: 402 });
        }
        if (msg.includes('safety')) {
          return NextResponse.json({
            error: `OpenAI заблокировал запрос: контент концепции несовместим с правилами генерации изображений. Попробуйте другую концепцию или перефразируйте ТЗ.\n\nОшибка: ${msg}`
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
        let errMsg = `Supabase: ${uploadError.message}.`;
        if (uploadError.message.includes('Bucket not found')) errMsg += ' Создайте бакет "creatives".';
        else if (uploadError.message.includes('row-level security')) errMsg += ' Добавьте RLS INSERT для бакета "creatives".';
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
