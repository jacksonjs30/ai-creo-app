import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptId, scriptText, avatarName, productName, action, oldImageUrl, count = 1 } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API Key is missing' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Build the DALL-E prompt
    let prompt = `Create a highly detailed, professional advertising image for a product called "${productName}". Target audience: "${avatarName}". `;
    prompt += `Visual scene description from the ad script: "${scriptText.substring(0, 1000)}". `;
    prompt += `CRITICAL INSTRUCTION: Do NOT include any text, words, letters, logos, or typography in the image whatsoever. Focus entirely on the visual scene, characters, and aesthetics. Ensure the aesthetic is premium, modern, and highly engaging.`;

    console.log(`Generating ${count} image(s) for script ${scriptId}...`);

    const imagePromises = Array.from({ length: count }).map(async (_, index) => {
      // Call OpenAI DALL-E 3 (with fallback to DALL-E 2 if key doesn't have permissions)
      let response;
      try {
        response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard"
        });
      } catch (e: any) {
        if (e.message && e.message.includes("does not exist")) {
          console.log("Falling back to dall-e-2 due to API key restrictions...");
          response = await openai.images.generate({
            model: "dall-e-2",
            prompt: prompt,
            n: 1,
            size: "512x512" 
          });
        } else {
          throw e;
        }
      }

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("OpenAI did not return an image URL");
      }

      // Download the image
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) throw new Error("Failed to download image from OpenAI");
      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Initialize Supabase Admin client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const cookieStore = await cookies();
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
      });

      // Upload to Supabase Storage
      const fileName = `${projectId}/${scriptId}/${Date.now()}_${index}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("violates row-level security policy")) {
          throw new Error(`Ошибка доступа к Supabase Storage: ${uploadError.message}. Убедитесь, что бакет creatives существует и имеет RLS политику разрешающую INSERT.`);
        }
        throw new Error(`Upload to Supabase failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('creatives')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    });

    const finalUrls = await Promise.all(imagePromises);

    // Optional: if action === 'replace' and oldImageUrl exists, we could delete the old image from Supabase
    if (action === 'replace' && oldImageUrl && oldImageUrl.includes('supabase.co')) {
      try {
        const urlParts = oldImageUrl.split('/creatives/');
        if (urlParts.length > 1) {
          const pathToDelete = urlParts[1];
          // We can't delete with ANON key without RLS DELETE policy, but we can try
          const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => [], setAll: () => {} } });
          await supabase.storage.from('creatives').remove([pathToDelete]);
        }
      } catch (delErr) {
        console.error("Failed to delete old image:", delErr);
      }
    }

    return NextResponse.json({ success: true, urls: finalUrls, url: finalUrls[0] });



  } catch (error: any) {
    console.error('Error in /api/images/generate:', error);
    return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
  }
}
