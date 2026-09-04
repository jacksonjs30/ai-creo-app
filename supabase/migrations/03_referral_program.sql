-- Referral Program Migration

-- 1. Modify users table
ALTER TABLE public.users ADD COLUMN referral_token varchar(32) UNIQUE;
ALTER TABLE public.users ADD COLUMN referred_by_user_id uuid REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN referred_at timestamp with time zone;

CREATE INDEX idx_users_referred_by ON public.users(referred_by_user_id);

-- 2. referrals table
CREATE TABLE public.referrals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_user_id uuid NOT NULL REFERENCES public.users(id),
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.users(id),
  status varchar(16) NOT NULL CHECK (status IN ('signed_up', 'paid', 'rewarded', 'rejected')),
  reject_reason varchar(64) NULL,
  signed_up_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  first_paid_at timestamp with time zone NULL,
  reward_due_at timestamp with time zone NULL,
  rewarded_at timestamp with time zone NULL,
  reward_cents integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_referrals_referrer_status ON public.referrals(referrer_user_id, status);
CREATE INDEX idx_referrals_status_reward_due ON public.referrals(status, reward_due_at);

-- RLS for referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own referrals as referrer" ON public.referrals FOR SELECT USING (auth.uid() = referrer_user_id);

-- 3. credit_ledger table
CREATE TABLE public.credit_ledger (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  amount_cents integer NOT NULL,
  entry_type varchar(24) NOT NULL CHECK (entry_type IN ('referral_bonus', 'invoice_applied', 'expiration', 'manual_adjustment')),
  referral_id uuid NULL REFERENCES public.referrals(id),
  invoice_ref varchar(128) NULL,
  expires_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_credit_ledger_user_created ON public.credit_ledger(user_id, created_at);
CREATE UNIQUE INDEX idx_credit_ledger_referral_bonus ON public.credit_ledger(referral_id) WHERE entry_type = 'referral_bonus';

-- RLS for credit_ledger
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own ledger" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id);

-- 4. referral_clicks table
CREATE TABLE public.referral_clicks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  token varchar(32) NOT NULL,
  ip_hash varchar(64) NULL,
  user_agent_hash varchar(64) NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- 4.5 webhook_events table
CREATE TABLE public.webhook_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_event_id varchar(128) NOT NULL UNIQUE,
  provider varchar(32) NOT NULL,
  event_type varchar(64) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 5. Trigger for new user registration to handle referral attribution
CREATE OR REPLACE FUNCTION public.generate_referral_token()
RETURNS varchar(32) AS $$
DECLARE
  v_new_token varchar(32);
  v_retry int := 0;
  v_success boolean := false;
BEGIN
  WHILE NOT v_success AND v_retry < 5 LOOP
    BEGIN
      -- Create random 12-char string from alphabet (excluding visually ambiguous)
      v_new_token := (
        SELECT array_to_string(array(
          SELECT substr('abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', trunc(random() * 57)::integer + 1, 1)
          FROM generate_series(1, 12)
        ), '')
      );
      
      -- If used inside a trigger where we are inserting, we can't reliably check if it exists before insert due to race conditions
      -- but this function just returns a token. The caller handles unique violation.
      RETURN v_new_token;
    END;
  END LOOP;
  RAISE EXCEPTION 'Failed to generate unique referral token';
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill existing users (create token for them)
DO $$
DECLARE
  user_record RECORD;
  v_token varchar(32);
  v_retry int;
  v_success boolean;
BEGIN
  FOR user_record IN SELECT id FROM public.users WHERE referral_token IS NULL LOOP
    v_retry := 0;
    v_success := false;
    WHILE NOT v_success AND v_retry < 5 LOOP
      BEGIN
        v_token := public.generate_referral_token();
        UPDATE public.users SET referral_token = v_token WHERE id = user_record.id;
        v_success := true;
      EXCEPTION WHEN unique_violation THEN
        v_retry := v_retry + 1;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Make referral_token NOT NULL after backfilling
ALTER TABLE public.users ALTER COLUMN referral_token SET NOT NULL;

-- Trigger logic for auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_with_referral()
RETURNS TRIGGER AS $$
DECLARE
  v_ref_token text;
  v_referrer_id uuid;
  v_new_token varchar(32);
  v_retry int := 0;
  v_success boolean := false;
BEGIN
  v_ref_token := NEW.raw_user_meta_data->>'ref_token';
  
  WHILE NOT v_success AND v_retry < 5 LOOP
    BEGIN
      v_new_token := public.generate_referral_token();
      INSERT INTO public.users (id, email, role, created_at, referral_token)
      VALUES (NEW.id, NEW.email, 'user', NEW.created_at, v_new_token);
      v_success := true;
    EXCEPTION WHEN unique_violation THEN
      v_retry := v_retry + 1;
    END;
  END LOOP;

  IF NOT v_success THEN
    RAISE EXCEPTION 'Failed to generate unique referral token';
  END IF;

  IF v_ref_token IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM public.users WHERE referral_token = v_ref_token;
    
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      -- Run checks: not self (checked above)
      -- Insert referral
      UPDATE public.users 
      SET referred_by_user_id = v_referrer_id, referred_at = now() 
      WHERE id = NEW.id;
      
      INSERT INTO public.referrals (referrer_user_id, referred_user_id, status, signed_up_at)
      VALUES (v_referrer_id, NEW.id, 'signed_up', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_referral();

-- Explicit function to apply referral (if not handled by trigger)
CREATE OR REPLACE FUNCTION public.apply_referral(p_user_id uuid, p_token text)
RETURNS void AS $$
DECLARE
  v_referrer_id uuid;
  v_already_referred boolean;
BEGIN
  -- Check if already referred
  SELECT referred_by_user_id IS NOT NULL INTO v_already_referred 
  FROM public.users WHERE id = p_user_id;
  
  IF v_already_referred THEN
    RETURN;
  END IF;
  SELECT id INTO v_referrer_id FROM public.users WHERE referral_token = p_token;
  
  IF v_referrer_id IS NOT NULL AND v_referrer_id != p_user_id THEN
    UPDATE public.users 
    SET referred_by_user_id = v_referrer_id, referred_at = now() 
    WHERE id = p_user_id;
    
    INSERT INTO public.referrals (referrer_user_id, referred_user_id, status, signed_up_at)
    VALUES (v_referrer_id, p_user_id, 'signed_up', now())
    ON CONFLICT (referred_user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process referral rewards (called by cron)
CREATE OR REPLACE FUNCTION public.process_referral_rewards(p_reward_cents int, p_monthly_cap int, p_expiry_days int)
RETURNS int AS $$
DECLARE
  v_referral RECORD;
  v_monthly_count int;
  v_processed int := 0;
BEGIN
  -- Process expirations first
  INSERT INTO public.credit_ledger (user_id, amount_cents, entry_type, referral_id, expires_at)
  SELECT user_id, -amount_cents, 'expiration', referral_id, NULL
  FROM public.credit_ledger cl
  WHERE entry_type = 'referral_bonus'
    AND expires_at <= now()
    AND NOT EXISTS (
      SELECT 1 FROM public.credit_ledger exp 
      WHERE exp.entry_type = 'expiration' AND exp.referral_id = cl.referral_id
    );

  -- Process rewards
  FOR v_referral IN 
    SELECT * FROM public.referrals 
    WHERE status = 'paid' AND reward_due_at <= now()
  LOOP
    -- Check monthly cap
    SELECT COUNT(*) INTO v_monthly_count 
    FROM public.referrals 
    WHERE referrer_user_id = v_referral.referrer_user_id 
      AND status = 'rewarded' 
      AND date_trunc('month', rewarded_at) = date_trunc('month', now());
      
    IF v_monthly_count >= p_monthly_cap THEN
      UPDATE public.referrals SET status = 'rejected', reject_reason = 'monthly_cap' WHERE id = v_referral.id;
      CONTINUE;
    END IF;

    -- Update referral
    UPDATE public.referrals 
    SET status = 'rewarded', rewarded_at = now(), reward_cents = p_reward_cents 
    WHERE id = v_referral.id;
    
    -- Insert ledger
    INSERT INTO public.credit_ledger (user_id, amount_cents, entry_type, referral_id, expires_at)
    VALUES (
      v_referral.referrer_user_id, 
      p_reward_cents, 
      'referral_bonus', 
      v_referral.id, 
      now() + (p_expiry_days || ' days')::interval
    );
    
    v_processed := v_processed + 1;
  END LOOP;
  
  RETURN v_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
