import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300; // 5 minutes for 3 images
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptId, scriptText, designBrief, avatarName, productName, action, oldImageUrl, count = 1 } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'OPENAI_API_KEY не найден. Добавьте его в Vercel → Settings → Environment Variables.'
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Sanitize text to avoid safety violations from explicit ad hooks
    const sanitize = (text: string): string => {
      return text
        .replace(/оргазм/gi, 'удовольствие')
        .replace(/оргазму/gi, 'удовольствия')
        .replace(/сексу/gi, 'близости')
        .replace(/секс/gi, 'отношения')
        .replace(/стогн\w*/gi, 'восхищаются')
        .replace(/еротич\w*/gi, 'романтическ')
        .replace(/оргазм|orgasm/gi, 'pleasure')
        .replace(/sex\w*/gi, 'intimacy')
        .replace(/nude|naked|explicit/gi, 'authentic')
        .substring(0, 800);
    };

    // The designBrief is the most useful column for images (colors, layout, composition)
    // scriptText is the full row text as fallback
    const visualSource = designBrief 
      ? sanitize(designBrief)
      : sanitize(scriptText || '');

    // 3 compositional variations for richer, diverse output
    const variations = [
      'Close-up emotional portrait, studio quality lighting, cinematic framing.',
      'Lifestyle scene with real environment, natural lighting, authentic context.',
      'Bold graphic design composition, strong visual hierarchy, modern art-direction.',
    ];

    const buildPrompt = (variationHint: string) => {
      const parts = [
        `Professional advertising visual creative. Product: "${productName}". Target audience: "${avatarName}".`,
        `Design brief and visual guidelines:\n${visualSource}`,
        `Compositional style: ${variationHint}`,
        `Create a premium, polished advertising image following the design brief above. Focus on colors, mood, layout, and composition as described.`,
      ];
      return parts.join('\n\n');
    };

    console.log(`Generating ${count} image(s) via gpt-image-1 for script ${scriptId}...`);

    // Initialize Supabase once
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
    });

    const finalUrls: string[] = [];

    // Generate sequentially to respect rate limits
    for (let index = 0; index < count; index++) {
      const prompt = buildPrompt(variations[index % variations.length]);

      // gpt-image-1 always returns base64, not a URL
      let b64ImageData: string;
      try {
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'medium', // low | medium | high
        });

        const imgData = response.data?.[0];
        if (!imgData?.b64_json) {
          throw new Error('gpt-image-1 не вернул данные изображения (b64_json пустой).');
        }
        b64ImageData = imgData.b64_json;

      } catch (openAiError: any) {
        const msg: string = openAiError?.message || openAiError?.toString() || '';
        console.error('OpenAI image generation error:', msg);

        // Provide actionable error messages
        if (msg.includes('does not exist') || msg.includes('model_not_found')) {
          return NextResponse.json({
            error: `Модель gpt-image-1 недоступна для вашего ключа. Убедитесь что:\n1. Ключ имеет тип "All" permissions\n2. Аккаунт на Tier 1+ (пополнен баланс)\n3. Ключ создан в Default project.\n\nОшибка: ${msg}`
          }, { status: 400 });
        }
        if (msg.includes('billing') || msg.includes('quota') || msg.includes('insufficient')) {
          return NextResponse.json({
            error: `Недостаточно кредитов на счету OpenAI. Пополните баланс на platform.openai.com/billing.\n\nОшибка: ${msg}`
          }, { status: 402 });
        }
        throw openAiError;
      }

      // Convert base64 → Buffer
      const buffer = Buffer.from(b64ImageData, 'base64');

      // Upload to Supabase Storage
      const fileName = `${projectId}/${scriptId}/${Date.now()}_${index}.png`;

      const { error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

      if (uploadError) {
        let errMsg = `Ошибка загрузки в Supabase: ${uploadError.message}. `;
        if (uploadError.message.includes('Bucket not found')) {
          errMsg += 'Создайте публичный бакет "creatives" в Supabase Storage.';
        } else if (uploadError.message.includes('row-level security')) {
          errMsg += 'Добавьте RLS политику INSERT (USING = true) для бакета "creatives" в Supabase.';
        }
        throw new Error(errMsg);
      }

      const { data: publicUrlData } = supabase.storage.from('creatives').getPublicUrl(fileName);
      finalUrls.push(publicUrlData.publicUrl);
    }

    // Clean up old image on replace
    if (action === 'replace' && oldImageUrl && oldImageUrl.includes('supabase.co')) {
      try {
        const urlParts = oldImageUrl.split('/creatives/');
        if (urlParts.length > 1) {
          const supabaseDel = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => [], setAll: () => {} } }
          );
          await supabaseDel.storage.from('creatives').remove([urlParts[1]]);
        }
      } catch {
        // Non-critical cleanup failure, ignore
      }
    }

    return NextResponse.json({ success: true, urls: finalUrls, url: finalUrls[0] });

  } catch (error: any) {
    console.error('Error in /api/images/generate:', error);
    return NextResponse.json({ error: error.message || 'Не удалось сгенерировать картинку.' }, { status: 500 });
  }
}
