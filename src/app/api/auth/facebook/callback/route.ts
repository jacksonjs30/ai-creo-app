import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=fb_auth_failed', req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url));
  }

  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) throw new Error(tokenData.error.message);
    
    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for long-lived token
    const longTokenRes = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
    const longTokenData = await longTokenRes.json();
    
    if (longTokenData.error) throw new Error(longTokenData.error.message);
    
    const longLivedToken = longTokenData.access_token;

    // 3. Get FB User ID to store mapping
    const meRes = await fetch(`https://graph.facebook.com/me?access_token=${longLivedToken}`);
    const meData = await meRes.json();
    const fbUserId = meData.id;

    // 4. Save to Supabase
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
    
    if (!user) {
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
    }

    // Upsert into user_integrations
    const { error: dbError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'facebook',
        access_token: longLivedToken,
        provider_user_id: fbUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, provider' });

    if (dbError) throw dbError;

    // Redirect back to app (with a success parameter)
    return NextResponse.redirect(new URL('/?fb_connected=true', req.url));

  } catch (err: any) {
    console.error('FB Auth Error:', err);
    return NextResponse.redirect(new URL('/?error=fb_auth_error', req.url));
  }
}
