import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 300; // 5 minutes for 3 images
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptId, scriptText, avatarName, productName, action, oldImageUrl, imageIndex, count = 1 } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY не найден. Добавьте его в Vercel → Settings → Environment Variables.' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Extract key ad copy text from the script (look for lines with quotes or hooks)
    const scriptLines = scriptText.split('\n').filter((l: string) => l.trim().length > 10);
    const adCopyText = scriptLines.slice(0, 5).join(' ').substring(0, 400);

    // Build a rich DALL-E 3 prompt that INCLUDES the ad text overlaid on the image
    const buildPrompt = (variationHint: string) => {
      let p = `Professional advertising creative image. Product: "${productName}". Target audience: "${avatarName}". `;
      p += `Ad script scene: "${adCopyText}". `;
      p += `Style: modern, premium, high-contrast. `;
      p += `${variationHint}`;
      p += ` The image should tell a visual story matching the ad script. No random decorative text — only text that is a natural part of the scene or design if the script calls for it.`;
      return p;
    };

    const variations = [
      'Composition: close-up emotional portrait shot.',
      'Composition: lifestyle scene with environment and context.',
      'Composition: bold graphic/abstract style with strong visual hierarchy.',
    ];

    console.log(`Generating ${count} image(s) sequentially for script ${scriptId}...`);

    const finalUrls: string[] = [];

    // Generate sequentially (not parallel) to avoid Vercel timeout and OpenAI rate limits
    for (let index = 0; index < count; index++) {
      const prompt = buildPrompt(variations[index % variations.length]);

      // DALL-E 3 only — no fallback. If the key doesn't support it, throw a clear error.
      let response;
      try {
        response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        });
      } catch (openAiError: any) {
        const msg = openAiError?.message || '';
        if (msg.includes('does not exist') || msg.includes('model_not_found')) {
          return NextResponse.json({
            error: `DALL-E 3 недоступен для вашего ключа OpenAI. Убедитесь, что:\n1. На балансе есть средства (platform.openai.com/billing)\n2. Ключ имеет тип "All" permissions\n3. Аккаунт не ограничен географически.\n\nОшибка от OpenAI: ${msg}`
          }, { status: 400 });
        }
        throw openAiError;
      }

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('OpenAI не вернул URL картинки. Попробуйте снова.');
      }

      // Download the image from OpenAI (URL is valid for ~1 hour)
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) throw new Error('Не удалось скачать картинку с серверов OpenAI.');
      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage for permanent storage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const cookieStore = await cookies();
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
      });

      const timestamp = Date.now();
      const fileName = `${projectId}/${scriptId}/${timestamp}_${index}.png`;

      const { error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

      if (uploadError) {
        let errMsg = `Ошибка загрузки в Supabase: ${uploadError.message}. `;
        if (uploadError.message.includes('Bucket not found')) {
          errMsg += 'Создайте публичный бакет "creatives" в Supabase Storage.';
        } else if (uploadError.message.includes('row-level security')) {
          errMsg += 'Добавьте RLS политику INSERT для анонимных пользователей в бакете "creatives".';
        }
        throw new Error(errMsg);
      }

      const { data: publicUrlData } = supabase.storage.from('creatives').getPublicUrl(fileName);
      finalUrls.push(publicUrlData.publicUrl);
    }

    // If replacing a single image, optionally clean up the old one
    if (action === 'replace' && oldImageUrl && oldImageUrl.includes('supabase.co')) {
      try {
        const urlParts = oldImageUrl.split('/creatives/');
        if (urlParts.length > 1) {
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => [], setAll: () => {} } }
          );
          await supabase.storage.from('creatives').remove([urlParts[1]]);
        }
      } catch {
        // Non-critical: old image cleanup failed, ignore
      }
    }

    return NextResponse.json({ success: true, urls: finalUrls, url: finalUrls[0] });

  } catch (error: any) {
    console.error('Error in /api/images/generate:', error);
    return NextResponse.json({ error: error.message || 'Не удалось сгенерировать картинку.' }, { status: 500 });
  }
}
