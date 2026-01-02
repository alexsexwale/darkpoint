-- ============================================
-- Migration 036: Fix claim_daily_reward_v2 column mismatch (400 on claim)
-- ============================================
-- Root cause:
-- - `daily_logins` table (from 001_gamification_schema.sql) uses:
--     day_of_streak, bonus_reward
-- - `claim_daily_reward_v2` (from 031_fix_welcome_reward.sql) inserts into:
--     streak_day, bonus_spin
-- This causes Postgres error 42703 and Supabase returns 400 when claiming.

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

  -- Check if already claimed today (use profile last_login_date as source of truth)
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
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_login_date IS NULL THEN
    v_new_streak := 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_longest_streak := GREATEST(v_profile.longest_streak, v_new_streak);

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
    total_xp = total_xp + v_xp_earned,
    available_spins = CASE WHEN v_free_spin_earned THEN available_spins + 1 ELSE available_spins END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log XP transaction
  IF v_xp_earned > 0 THEN
    BEGIN
      INSERT INTO public.xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_xp_earned, 'daily_login', 'Day ' || v_cycle_day || ' streak reward');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Log daily login (compat with existing schema)
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
  EXCEPTION
    WHEN undefined_column THEN
      -- If a newer schema exists with streak_day/bonus_spin, use that.
      INSERT INTO public.daily_logins (user_id, login_date, streak_day, xp_earned, bonus_spin)
      VALUES (p_user_id, v_today, v_new_streak, v_xp_earned, v_free_spin_earned)
      ON CONFLICT (user_id, login_date) DO NOTHING;
    WHEN OTHERS THEN
      NULL;
  END;

  -- Apply XP multiplier on day 4 (if function exists)
  IF v_cycle_day = 4 THEN
    BEGIN
      PERFORM public.grant_xp_multiplier(p_user_id, 1.5, 24, 'daily_streak', 'Day 4 Login Reward: 1.5x XP for 24 hours');
      v_multiplier_applied := TRUE;
    EXCEPTION WHEN undefined_function THEN
      v_multiplier_applied := FALSE;
    WHEN OTHERS THEN
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

GRANT EXECUTE ON FUNCTION public.claim_daily_reward_v2(UUID) TO authenticated;


