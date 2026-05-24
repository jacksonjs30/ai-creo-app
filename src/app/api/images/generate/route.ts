import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Extract ONLY visual design parameters from the designer brief.
 * Drops all ad copy / headline sections that may trigger safety filters.
 */
function extractVisualParams(rawBrief: string): string {
  const lines = rawBrief.split('\n');
  const visualLines: string[] = [];

  // Keywords that signal a visual design line (safe to include)
  const safeKeywords = [
    'фон', 'колір', 'кольор', 'цвет', 'палітр', 'палитр', 'background',
    'шрифт', 'font', 'типограф', 'розмір', 'размер', 'size',
    'розташ', 'композ', 'composition', 'layout',
    'стиль', 'style', 'mood', 'настрій',
    'освітл', 'lighting', 'тон', 'tone',
    'референс', 'reference', 'Pinterest',
    'акцент', 'accent', 'контраст', 'contrast',
    'іконограф', 'відступ', 'margin', 'border',
    'бренд-гайдлайн', 'brand',
    '1080', '1024', 'px', 'instagram', 'facebook',
    'gradient', 'градієнт', 'тіні', 'shadow',
    'сріблястий', 'золотий', 'синій', 'фіолетовий', 'рожевий',
    'персиков', 'бежев', 'темно', 'світло',
  ];

  // Keywords that signal ad copy / hook content (must DROP)
  const unsafeKeywords = [
    'заголовок', 'хук', 'hook', 'тезис', 'біль', 'рішення',
    'cta', 'кнопка', 'button', 'знижка',
    'оргазм', 'стогн', 'секс', 'секрет подруг',
    'orgasm', 'sex', 'erotic', 'intimate act',
    'розкрий свій', 'моє тіло',
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Drop lines that contain any ad-copy/unsafe keywords
    if (unsafeKeywords.some(kw => lower.includes(kw))) continue;
    // Include lines that mention visual/design keywords
    if (safeKeywords.some(kw => lower.includes(kw))) {
      // Strip any inline quoted ad copy (text inside quotes)
      const cleaned = line.replace(/"[^"]{10,}"/g, '').replace(/«[^»]{10,}»/g, '').trim();
      if (cleaned.length > 3) visualLines.push(cleaned);
    }
  }

  return visualLines.join('\n').substring(0, 700);
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptId, designBrief, avatarName, productName, action, oldImageUrl, count = 1 } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OPENAI_API_KEY не найден. Добавьте его в Vercel → Settings → Environment Variables.'
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Extract ONLY the visual design params — drop all ad copy / hooks
    const visualParams = extractVisualParams(designBrief || '');

    // If nothing usable extracted, fallback to generic lifestyle prompt
    const hasVisualParams = visualParams.length > 20;

    // 3 compositional variations
    const variations = [
      'Close-up lifestyle portrait, warm studio lighting, cinematic look.',
      'Real environment lifestyle scene, authentic natural light, editorial style.',
      'Bold modern graphic composition, strong visual hierarchy, minimalist design.',
    ];

    const buildPrompt = (variationHint: string): string => {
      if (hasVisualParams) {
        return [
          `Create a premium advertising image. Composition style: ${variationHint}`,
          `Visual design specifications:`,
          visualParams,
          `Focus only on the visual aesthetics: colors, mood, lighting, typography placement. Do not include explicit text in the image.`,
        ].join('\n\n');
      } else {
        // Completely generic fallback — no product context at all
        return `Create a premium, modern advertising image. Style: ${variationHint}. Mood: empowering, elegant, sophisticated. Color palette: deep purple and gold with soft gradients. No text in the image.`;
      }
    };

    console.log(`[images/generate] Generating ${count} image(s) via gpt-image-1 for ${scriptId}. Visual params length: ${visualParams.length}`);

    // Init Supabase once
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    );

    const finalUrls: string[] = [];

    for (let index = 0; index < count; index++) {
      const prompt = buildPrompt(variations[index % variations.length]);
      console.log(`[images/generate] Prompt #${index}:\n${prompt.substring(0, 300)}...`);

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
        if (!imgData?.b64_json) {
          throw new Error('gpt-image-1 не вернул данные изображения.');
        }
        b64ImageData = imgData.b64_json;

      } catch (openAiError: any) {
        const msg: string = openAiError?.message || '';
        console.error('[images/generate] OpenAI error:', msg);

        if (msg.includes('does not exist') || msg.includes('model_not_found')) {
          return NextResponse.json({
            error: `Модель gpt-image-1 недоступна для этого ключа.\nПроверьте: Tier 1+ и разрешения "All" в настройках ключа.\n\n${msg}`
          }, { status: 400 });
        }
        if (msg.includes('billing') || msg.includes('quota') || msg.includes('insufficient')) {
          return NextResponse.json({
            error: `Недостаточно кредитов OpenAI. Пополните баланс.\n\n${msg}`
          }, { status: 402 });
        }
        if (msg.includes('safety')) {
          // Log the full prompt for debugging
          console.error('[images/generate] Safety violation. Full prompt was:\n', prompt);
          return NextResponse.json({
            error: `OpenAI заблокировал запрос из-за контента. Попробуйте выбрать другую концепцию или перегенерировать сценарий.\n\nОшибка: ${msg}`
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
        let errMsg = `Ошибка загрузки в Supabase: ${uploadError.message}. `;
        if (uploadError.message.includes('Bucket not found')) {
          errMsg += 'Создайте публичный бакет "creatives" в Supabase Storage.';
        } else if (uploadError.message.includes('row-level security')) {
          errMsg += 'Добавьте RLS политику INSERT для бакета "creatives".';
        }
        throw new Error(errMsg);
      }

      const { data: publicUrlData } = supabase.storage.from('creatives').getPublicUrl(fileName);
      finalUrls.push(publicUrlData.publicUrl);
    }

    // Cleanup old image on replace
    if (action === 'replace' && oldImageUrl?.includes('supabase.co')) {
      try {
        const pathPart = oldImageUrl.split('/creatives/')[1];
        if (pathPart) {
          await supabase.storage.from('creatives').remove([pathPart]);
        }
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ success: true, urls: finalUrls, url: finalUrls[0] });

  } catch (error: any) {
    console.error('[images/generate] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Не удалось сгенерировать картинку.' }, { status: 500 });
  }
}
