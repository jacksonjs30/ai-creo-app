import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptId, scriptText, avatarName, productName, action, oldImageUrl } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API Key is missing' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Build the DALL-E prompt
    let prompt = `Create a professional advertising image for a product called "${productName}". Target audience: "${avatarName}". `;
    prompt += `Visual context from the ad script: "${scriptText.substring(0, 1000)}". `;
    prompt += `Ensure the aesthetic is premium, modern, and highly engaging. If the script implies a meme or a specific format, adapt the style accordingly. Do not generate large amounts of text.`;

    console.log(`Generating image for script ${scriptId}...`);

    // Call OpenAI DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("OpenAI did not return an image URL");
    }

    // Download the image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to download image from OpenAI");
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Supabase Admin client (or standard client with anon key)
    // To bypass RLS for uploads, we try to use the ANON key if policies allow,
    // or ideally a service role key. We'll use ANON and rely on the bucket being public and allowing uploads.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // We don't really need cookies for storage upload if bucket is public, but let's use the standard setup
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
    });

    // Upload to Supabase Storage
    const fileName = `${projectId}/${scriptId}/${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('creatives')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      
      // If the bucket doesn't exist, we fallback to just returning the OpenAI URL (which lasts 1 hour)
      // or we throw an error instructing the user to create the bucket.
      if (uploadError.message.includes("Bucket not found")) {
        return NextResponse.json({ 
          error: "Бакет 'creatives' не найден в Supabase. Пожалуйста, создайте публичный бакет с именем 'creatives' в Supabase Storage."
        }, { status: 500 });
      }

      throw new Error(`Upload to Supabase failed: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('creatives')
      .getPublicUrl(fileName);

    const finalUrl = publicUrlData.publicUrl;

    // Optional: if action === 'replace' and oldImageUrl exists, we could delete the old image from Supabase
    if (action === 'replace' && oldImageUrl && oldImageUrl.includes('supabase.co')) {
      try {
        // Extract file path from URL
        const urlParts = oldImageUrl.split('/creatives/');
        if (urlParts.length > 1) {
          const pathToDelete = urlParts[1];
          await supabase.storage.from('creatives').remove([pathToDelete]);
          console.log(`Deleted old image: ${pathToDelete}`);
        }
      } catch (delErr) {
        console.error("Failed to delete old image:", delErr);
      }
    }

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (error: any) {
    console.error('Error in /api/images/generate:', error);
    return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
  }
}
