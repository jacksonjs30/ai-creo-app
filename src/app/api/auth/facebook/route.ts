import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;
  
  if (!appId || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: 'Missing FB_APP_ID or APP_URL in env' }, { status: 500 });
  }

  // Define scopes
  const scopes = 'ads_management,ads_read,business_management';

  const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
  
  return NextResponse.redirect(authUrl);
}
