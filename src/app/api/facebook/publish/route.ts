import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { actId, adsetId, imageUrl, headline, primaryText, name } = await req.json();

    if (!actId || !adsetId || !imageUrl) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'facebook')
      .single();

    if (!integration || !integration.access_token) {
      return NextResponse.json({ error: 'Facebook not connected' }, { status: 403 });
    }
    
    const accessToken = integration.access_token;
    const baseActId = actId.startsWith('act_') ? actId : `act_${actId}`;

    // 1. Download image from URL and get bytes
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to download image from URL');
    const imgBlob = await imgRes.blob();

    // Upload image to FB
    const formData = new FormData();
    formData.append('filename', imgBlob, 'creative.png');
    formData.append('access_token', accessToken);

    const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${baseActId}/adimages`, {
      method: 'POST',
      body: formData
    });
    const uploadData = await uploadRes.json();
    if (uploadData.error) throw new Error(`Upload Error: ${uploadData.error.message}`);
    
    // The hash is usually returned under images.filename.hash or just images[name].hash
    // Since we sent 'filename', it's usually uploadData.images['creative.png'].hash or uploadData.images.filename.hash
    const hash = uploadData.images && Object.values(uploadData.images)[0] 
      ? (Object.values(uploadData.images)[0] as any).hash 
      : null;

    if (!hash) throw new Error('Could not get image hash from FB response');

    // 2. Create Ad Creative
    // Using standard Link Data format (or just image format, but Link Data is most common)
    // We'll construct a simple link ad if possible, or just an image ad.
    // For FB, usually an object_story_spec is used.
    
    // Facebook requires a page_id for most ads. We need to get one of the user's pages, or pass it from UI.
    // Wait, the user didn't select a Page. Let's try to fetch the first available page from the ad account or user.
    const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`);
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(`Pages Error: ${pagesData.error.message}`);
    
    const pageId = pagesData.data?.[0]?.id;
    if (!pageId) throw new Error('No Facebook Pages found. You must have at least one FB Page to run ads.');

    const creativePayload = {
      name: name || `AI Creo Creative ${Date.now()}`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          image_hash: hash,
          link: "https://example.com", // FB requires a link for most link ads, we put a placeholder
          message: primaryText || "AI Generated Ad",
          name: headline || "AI Headline"
        }
      },
      degrees_of_freedom_spec: {
        creative_features_spec: {
          standard_enhancements: {
            enroll_status: "OPT_OUT"
          }
        }
      },
      access_token: accessToken
    };

    const creativeRes = await fetch(`https://graph.facebook.com/v20.0/${baseActId}/adcreatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creativePayload)
    });
    const creativeData = await creativeRes.json();
    if (creativeData.error) throw new Error(`Creative Error: ${creativeData.error.message}`);
    const creativeId = creativeData.id;

    // 3. Create Ad
    const adPayload = {
      name: name || `AI Ad ${Date.now()}`,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED', // Always create as paused/draft
      access_token: accessToken
    };

    const adRes = await fetch(`https://graph.facebook.com/v20.0/${baseActId}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adPayload)
    });
    const adData = await adRes.json();
    if (adData.error) throw new Error(`Ad Error: ${adData.error.message}`);

    return NextResponse.json({ success: true, adId: adData.id });
  } catch (error: any) {
    console.error('Error publishing to FB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
