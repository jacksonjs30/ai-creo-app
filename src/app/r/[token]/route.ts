import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ATTRIBUTION_WINDOW_DAYS = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const token = (await params).token;
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  );

  // Check if token exists
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('referral_token', token)
    .single();

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Create response
  const response = NextResponse.redirect(new URL('/', request.url)); // redirect to main/signup

  // Set first-party cookie
  response.cookies.set({
    name: 'ref_token',
    value: token,
    maxAge: ATTRIBUTION_WINDOW_DAYS * 86400,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    path: '/',
    // domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN // Use if available, else omit
  });

  // Track click for analytics
  const ip = request.headers.get('x-forwarded-for') || '';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Hash ip and userAgent to comply with some privacy if needed (or store raw as per spec)
  const crypto = require('crypto');
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;
  const uaHash = userAgent ? crypto.createHash('sha256').update(userAgent).digest('hex') : null;

  await supabase.from('referral_clicks').insert({
    token,
    ip_hash: ipHash,
    user_agent_hash: uaHash
  });

  return response;
}
