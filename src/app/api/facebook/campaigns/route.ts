import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const actId = searchParams.get('act_id');

  if (!actId) {
    return NextResponse.json({ error: 'Missing act_id parameter' }, { status: 400 });
  }

  try {
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

    // Get campaigns
    const campRes = await fetch(`https://graph.facebook.com/v20.0/${actId}/campaigns?fields=id,name,status&limit=100&access_token=${integration.access_token}`);
    const campData = await campRes.json();
    if (campData.error) throw new Error(campData.error.message);

    // Get adsets
    const adsetRes = await fetch(`https://graph.facebook.com/v20.0/${actId}/adsets?fields=id,name,campaign_id,status&limit=200&access_token=${integration.access_token}`);
    const adsetData = await adsetRes.json();
    if (adsetData.error) throw new Error(adsetData.error.message);

    // Group adsets by campaign
    const campaigns = (campData.data || []).map((c: any) => ({
      ...c,
      adsets: (adsetData.data || []).filter((a: any) => a.campaign_id === c.id)
    }));

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
