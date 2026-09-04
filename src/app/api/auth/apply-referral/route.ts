import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookieStore = await cookies();
    const token = cookieStore.get('ref_token')?.value || body.ref_token;

    if (!token) {
      return NextResponse.json({ success: true, message: 'No referral token provided' });
    }

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call postgres function to apply referral to avoid race conditions and ensure transaction
    const { data, error } = await supabase.rpc('apply_referral', {
      p_user_id: user.id,
      p_token: token
    });

    if (error) {
      console.error('Apply referral error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete('ref_token');
    
    return response;

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
