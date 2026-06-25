import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
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

    const res = await fetch(`https://graph.facebook.com/v20.0/me/adaccounts?fields=name,account_id,id,account_status&limit=100&access_token=${integration.access_token}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    return NextResponse.json(data.data || []);
  } catch (error: any) {
    console.error('Error fetching ad accounts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
