import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '20', 10);
  const offset = (page - 1) * per_page;

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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Need to join with users to get email, then mask it
  const { data: referrals, count } = await supabase
    .from('referrals')
    .select(`
      id,
      status,
      signed_up_at,
      reward_cents,
      reward_due_at,
      reject_reason,
      referred_user:users!referrals_referred_user_id_fkey(email)
    `, { count: 'exact' })
    .eq('referrer_user_id', user.id)
    .order('signed_up_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (!referrals) {
    return NextResponse.json({ items: [], page, per_page, total: 0 });
  }

  const items = referrals.map((r: any) => {
    let masked_email = '';
    const email = r.referred_user?.email;
    if (email) {
      const parts = email.split('@');
      if (parts.length === 2) {
        masked_email = `${parts[0].charAt(0)}****@${parts[1]}`;
      }
    }

    return {
      id: r.id,
      masked_email,
      status: r.status,
      signed_up_at: r.signed_up_at,
      reward_cents: r.reward_cents,
      reward_due_at: r.reward_due_at,
      reject_reason: r.reject_reason
    };
  });

  return NextResponse.json({
    items,
    page,
    per_page,
    total: count || 0
  });
}
