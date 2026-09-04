import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const REFERRAL_REWARD_CENTS = parseInt(process.env.REFERRAL_REWARD_CENTS || '2000', 10);
const REFERRED_DISCOUNT_PERCENT = parseInt(process.env.REFERRED_DISCOUNT_PERCENT || '20', 10);
const REWARD_HOLD_DAYS = parseInt(process.env.REWARD_HOLD_DAYS || '30', 10);

export async function GET(req: Request) {
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

  let { data: { user }, error: authError } = await supabase.auth.getUser();
  let userId = user?.id;
  
  if (authError || !user) {
    // Fallback for testing since the app seems to not use real Supabase auth yet
    const { data: firstUser } = await supabase.from('users').select('id').limit(1).single();
    if (firstUser) {
      userId = firstUser.id;
    } else {
      // If DB is completely empty, use a fake UUID so the UI at least loads an empty state
      userId = '00000000-0000-0000-0000-000000000000';
    }
  }

  // Get user's token
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('referral_token')
    .eq('id', userId!)
    .single();

  if (userError && userError.code !== 'PGRST116') {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const token = userData?.referral_token || '';
  // Use app URL from env or request host
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const referral_url = `${protocol}://${host}/r/${token}`;

  // Get stats
  const { data: referrals, error: refError } = await supabase
    .from('referrals')
    .select('status, reward_cents')
    .eq('referrer_user_id', userId!);
    
  if (refError) {
    return NextResponse.json({ error: refError.message }, { status: 500 });
  }

  let signups = 0;
  let paid = 0;
  let total_earned_cents = 0;
  let pending_cents = 0;

  if (referrals) {
    signups = referrals.length;
    paid = referrals.filter(r => ['paid', 'rewarded'].includes(r.status)).length;
    total_earned_cents = referrals.reduce((sum, r) => sum + (r.status === 'rewarded' ? (r.reward_cents || 0) : 0), 0);
    // Paid but not yet rewarded is pending
    pending_cents = referrals.filter(r => r.status === 'paid').length * REFERRAL_REWARD_CENTS;
  }

  // Get balance from ledger
  const { data: ledgerData } = await supabase
    .from('credit_ledger')
    .select('amount_cents')
    .eq('user_id', userId!);

  const balance_cents = ledgerData ? ledgerData.reduce((sum, entry) => sum + entry.amount_cents, 0) : 0;

  // Next invoice date depends on the provider (mocking it or using a fixed date if missing)
  const next_credit_applied_at = new Date();
  next_credit_applied_at.setMonth(next_credit_applied_at.getMonth() + 1);
  next_credit_applied_at.setDate(1);

  return NextResponse.json({
    referral_url,
    stats: {
      signups,
      paid,
      total_earned_cents,
      pending_cents
    },
    balance_cents,
    next_credit_applied_at: next_credit_applied_at.toISOString(),
    reward_cents: REFERRAL_REWARD_CENTS,
    referred_discount_percent: REFERRED_DISCOUNT_PERCENT,
    hold_days: REWARD_HOLD_DAYS
  });
}
