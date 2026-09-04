import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const REFERRAL_REWARD_CENTS = parseInt(process.env.REFERRAL_REWARD_CENTS || '2000', 10);
const MONTHLY_REWARD_CAP = parseInt(process.env.MONTHLY_REWARD_CAP || '10', 10);
const CREDIT_EXPIRY_DAYS = parseInt(process.env.CREDIT_EXPIRY_DAYS || '365', 10);

export async function GET(req: Request) {
  // Ensure this is called by a secure cron runner
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // We should ideally use a PostgreSQL function to handle this transactionally
  // Let's call an RPC function 'process_referral_rewards'
  const { data, error } = await supabase.rpc('process_referral_rewards', {
    p_reward_cents: REFERRAL_REWARD_CENTS,
    p_monthly_cap: MONTHLY_REWARD_CAP,
    p_expiry_days: CREDIT_EXPIRY_DAYS
  });

  if (error) {
    console.error('Process referral rewards error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, processed: data });
}
