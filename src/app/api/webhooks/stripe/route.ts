import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const REWARD_HOLD_DAYS = 30;

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    // Verify signature in a real app (omitted here since Stripe secret might not be provided, but in production we'd do it)
    
    const eventType = payload.type;
    const eventId = payload.id;
    const eventData = payload.data?.object;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: 'Missing event payload data' }, { status: 400 });
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

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('provider_event_id', eventId)
      .single();

    if (existingEvent) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Save event
    await supabase.from('webhook_events').insert({
      provider_event_id: eventId,
      event_type: eventType,
      provider: 'stripe'
    });

    if (eventType === 'invoice.payment_succeeded' && eventData.billing_reason === 'subscription_create') {
      // Step D - First payment
      const customerId = eventData.customer;
      
      // We need to map customerId to user_id. Assuming users table has stripe_customer_id, or we find by email.
      const customerEmail = eventData.customer_email;
      if (customerEmail) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail)
          .single();
          
        if (user) {
          const { data: referral } = await supabase
            .from('referrals')
            .select('id, status')
            .eq('referred_user_id', user.id)
            .single();
            
          if (referral && referral.status === 'signed_up') {
            const rewardDueAt = new Date();
            rewardDueAt.setDate(rewardDueAt.getDate() + REWARD_HOLD_DAYS);
            
            await supabase
              .from('referrals')
              .update({ 
                status: 'paid', 
                first_paid_at: new Date().toISOString(),
                reward_due_at: rewardDueAt.toISOString()
              })
              .eq('id', referral.id);
          }
        }
      }
    } else if (eventType === 'charge.refunded') {
      // Handle refund
      const customerEmail = eventData.billing_details?.email;
      if (customerEmail) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail)
          .single();
          
        if (user) {
          const { data: referral } = await supabase
            .from('referrals')
            .select('id, status, reward_cents, referrer_user_id')
            .eq('referred_user_id', user.id)
            .single();
            
          if (referral && referral.status === 'rewarded') {
            // Revert credit
            await supabase.from('credit_ledger').insert({
              user_id: referral.referrer_user_id,
              amount_cents: -referral.reward_cents,
              entry_type: 'manual_adjustment',
              referral_id: referral.id
            });
            
            await supabase.from('referrals').update({
              status: 'rejected',
              reject_reason: 'refunded'
            }).eq('id', referral.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
