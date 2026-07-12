import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PROMPTS } from '@/lib/prompts';
import { CreativeDocument } from '@/types/creative-layout';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brief, size, language = 'uk', format = 'square' } = body;

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    // 1. Call Gemini to parse the brief into JSON layout
    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Gemini API Key is missing' }, { status: 500 });
    }

    const prompt = PROMPTS.PARSE_LAYOUT_PROMPT(brief, language);

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for deterministic JSON parsing
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API Error: ${geminiRes.status} ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up markdown wrapping if Gemini added it despite instructions
    const jsonStr = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    
    let document: CreativeDocument;
    try {
      document = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON:', rawText);
      throw new Error('LLM did not return a valid JSON structure.');
    }

    // 2. Generate Background with OpenAI
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is missing' }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: openAiApiKey });

    // Ensure text is rendered according to the scene description
    const bgPrompt = `
      Create a clean, professional advertising image.
      SCENE DESCRIPTION: ${document.backgroundHint || 'Clean modern gradient background.'}
      COLORS: Use colors transitioning from ${document.brandPalette?.bgGradientFrom || '#E0E7FF'} to ${document.brandPalette?.bgGradientTo || '#F3E8FF'}.
      STRICT RULE 1: Render the exact text specified in the scene description. Place all text strictly inside distinct badges, plates, or containers to ensure it is clearly legible and does not overflow or blend into the background.
      STRICT RULE 2: Include graphic icons next to the text bullets as specified in the scene description.
      STRICT RULE 3: Do not generate any UI elements unless specified in the scene description.
    `.trim();

    console.log('[layout-v1] Requesting background image with prompt:', bgPrompt);

    const ideogramApiKey = process.env.IDEOGRAM_API_KEY;
    if (!ideogramApiKey) {
      throw new Error('IDEOGRAM_API_KEY is missing');
    }

    const ideogramRes = await fetch('https://api.ideogram.ai/v1/ideogram-v4/generate', {
      method: 'POST',
      headers: {
        'Api-Key': ideogramApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text_prompt: bgPrompt,
        aspect_ratio: '1:1',
      })
    });

    if (!ideogramRes.ok) {
      const errText = await ideogramRes.text();
      throw new Error(`Ideogram API Error: ${ideogramRes.status} ${errText}`);
    }

    const ideogramData = await ideogramRes.json();
    const bgImageUrl = ideogramData?.data?.[0]?.url;

    if (!bgImageUrl) throw new Error('Ideogram API did not return image url.');

    // Gemini Vision step removed by user request
    let finalDocument = document;
    finalDocument.blocks = []; // User requested NO HTML layers, just pure image with baked-in text

    // 4. Upload Background to Supabase
    console.log('[layout-v1] Fetching and uploading image to Supabase...');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
    );

    const imageFetchRes = await fetch(bgImageUrl);
    if (!imageFetchRes.ok) throw new Error('Failed to download image from Ideogram');
    const buffer = Buffer.from(await imageFetchRes.arrayBuffer());
    const fileName = `backgrounds/layout_v1_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;

    const { error: uploadError } = await supabase.storage
      .from('creatives')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      throw new Error(`Supabase upload error: ${uploadError.message}`);
    }

    const { data: pub } = supabase.storage.from('creatives').getPublicUrl(fileName);
    const imageUrl = pub.publicUrl;

    // 5. Return Final Structure
    return NextResponse.json({
      background: {
        kind: 'gpt_image',
        imageUrl: imageUrl,
        prompt: bgPrompt,
        size: document.size || { width: 1080, height: 1080 }
      },
      document: finalDocument
    });

  } catch (error: any) {
    console.error('[layout-v1] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
