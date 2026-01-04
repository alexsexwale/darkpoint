-- ============================================
-- Quick Fix: Daily Reward Claim Function
-- ============================================
-- Run this in Supabase SQL Editor to fix daily reward claiming issues.
-- This creates/replaces the claim_daily_reward_v2 function with proper error handling.

-- First ensure the daily_logins table exists with the right columns
CREATE TABLE IF NOT EXISTS public.daily_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_streak INTEGER DEFAULT 1,
  xp_earned INTEGER DEFAULT 0,
  bonus_reward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, login_date)
);

-- Add columns if they don't exist (defensive)
DO $$ BEGIN
  ALTER TABLE public.daily_logins ADD COLUMN IF NOT EXISTS day_of_streak INTEGER DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.daily_logins ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.daily_logins ADD COLUMN IF NOT EXISTS bonus_reward TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create/replace the claim function
CREATE OR REPLACE FUNCTION public.claim_daily_reward_v2(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_longest_streak INTEGER;
  v_cycle_day INTEGER;
  v_xp_earned INTEGER := 0;
  v_free_spin_earned BOOLEAN := FALSE;
  v_multiplier_applied BOOLEAN := FALSE;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if already claimed today
  IF v_profile.last_login_date = v_today THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Already claimed today',
      'streak', v_profile.current_streak,
      'next_claim', v_today + INTERVAL '1 day'
    );
  END IF;

  -- Calculate new streak
  IF v_profile.last_login_date = v_yesterday THEN
    v_new_streak := COALESCE(v_profile.current_streak, 0) + 1;
  ELSIF v_profile.last_login_date IS NULL THEN
    v_new_streak := 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_longest_streak := GREATEST(COALESCE(v_profile.longest_streak, 0), v_new_streak);

  -- Calculate cycle day (1-7)
  v_cycle_day := ((v_new_streak - 1) % 7) + 1;

  -- Daily XP rewards (escalating)
  CASE v_cycle_day
    WHEN 1 THEN v_xp_earned := 5;
    WHEN 2 THEN v_xp_earned := 15;
    WHEN 3 THEN v_xp_earned := 25;
    WHEN 4 THEN v_xp_earned := 35;
    WHEN 5 THEN v_xp_earned := 50;
    WHEN 6 THEN v_xp_earned := 75;
    WHEN 7 THEN
      v_xp_earned := 100;
      v_free_spin_earned := TRUE;
    ELSE v_xp_earned := 10;
  END CASE;

  -- Update profile
  UPDATE public.user_profiles SET
    last_login_date = v_today,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    total_xp = COALESCE(total_xp, 0) + v_xp_earned,
    available_spins = CASE WHEN v_free_spin_earned THEN COALESCE(available_spins, 0) + 1 ELSE COALESCE(available_spins, 0) END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log XP transaction (wrapped to prevent failures)
  BEGIN
    INSERT INTO public.xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, v_xp_earned, 'daily_login', 'Day ' || v_cycle_day || ' streak reward');
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore if xp_transactions doesn't exist or has issues
    NULL;
  END;

  -- Log daily login (wrapped to prevent failures)
  BEGIN
    INSERT INTO public.daily_logins (user_id, login_date, day_of_streak, xp_earned, bonus_reward)
    VALUES (
      p_user_id,
      v_today,
      v_new_streak,
      v_xp_earned,
      CASE WHEN v_free_spin_earned THEN 'free_spin' ELSE NULL END
    )
    ON CONFLICT (user_id, login_date) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore if daily_logins has issues
    NULL;
  END;

  -- Apply XP multiplier on day 4 (if function exists)
  IF v_cycle_day = 4 THEN
    BEGIN
      PERFORM public.grant_xp_multiplier(p_user_id, 1.5, 24, 'daily_streak', 'Day 4 Login Reward: 1.5x XP for 24 hours');
      v_multiplier_applied := TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_multiplier_applied := FALSE;
    END;
  END IF;

  RETURN json_build_object(
    'success', true,
    'streak', v_new_streak,
    'cycle_day', v_cycle_day,
    'xp_earned', v_xp_earned,
    'free_spin_earned', v_free_spin_earned,
    'multiplier_applied', v_multiplier_applied,
    'longest_streak', v_longest_streak
  );
END;
$$;

-- Also create the fallback function for older schemas
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just call v2 - it handles everything
  RETURN public.claim_daily_reward_v2(p_user_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.claim_daily_reward_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward(UUID) TO authenticated;

-- Enable RLS on daily_logins if not already
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own daily logins" ON public.daily_logins;
CREATE POLICY "Users can view own daily logins" ON public.daily_logins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily logins" ON public.daily_logins;
CREATE POLICY "Users can insert own daily logins" ON public.daily_logins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant table access
GRANT SELECT, INSERT ON public.daily_logins TO authenticated;

