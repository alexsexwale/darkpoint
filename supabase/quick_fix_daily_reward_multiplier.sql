-- Quick fix: Apply XP multiplier to daily login rewards
-- Run this in Supabase SQL Editor to immediately fix the issue

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
  v_base_xp INTEGER := 0;
  v_xp_earned INTEGER := 0;
  v_bonus_xp INTEGER := 0;
  v_free_spin_earned BOOLEAN := FALSE;
  v_multiplier_applied BOOLEAN := FALSE;
  v_active_multiplier NUMERIC := 1;
  v_multiplier_record RECORD;
  v_bonus_reward TEXT := NULL;
  v_xp_description TEXT;
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
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_login_date IS NULL THEN
    v_new_streak := 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_longest_streak := GREATEST(v_profile.longest_streak, v_new_streak);
  v_cycle_day := ((v_new_streak - 1) % 7) + 1;

  -- Daily XP rewards (escalating) - base amounts
  CASE v_cycle_day
    WHEN 1 THEN v_base_xp := 5;
    WHEN 2 THEN v_base_xp := 15;
    WHEN 3 THEN v_base_xp := 25;
    WHEN 4 THEN v_base_xp := 35;
    WHEN 5 THEN 
      v_base_xp := 50;
      v_free_spin_earned := TRUE;
      v_bonus_reward := 'free_spin';
    WHEN 6 THEN v_base_xp := 75;
    WHEN 7 THEN
      v_base_xp := 100;
      v_free_spin_earned := TRUE;
      v_bonus_reward := 'free_spin';
    ELSE v_base_xp := 10;
  END CASE;

  -- Check for active XP multiplier
  BEGIN
    SELECT * INTO v_multiplier_record
    FROM public.user_xp_multipliers
    WHERE user_id = p_user_id
      AND is_active = true
      AND expires_at > NOW()
    ORDER BY multiplier DESC
    LIMIT 1;

    IF FOUND THEN
      v_active_multiplier := v_multiplier_record.multiplier;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    v_active_multiplier := 1;
  END;

  -- Apply multiplier to XP
  v_xp_earned := FLOOR(v_base_xp * v_active_multiplier);
  v_bonus_xp := v_xp_earned - v_base_xp;

  -- Update profile
  UPDATE public.user_profiles SET
    last_login_date = v_today,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    total_xp = total_xp + v_xp_earned,
    available_spins = CASE WHEN v_free_spin_earned THEN available_spins + 1 ELSE available_spins END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Build XP description with multiplier info
  IF v_active_multiplier > 1 THEN
    v_xp_description := 'Day ' || v_new_streak || ' streak reward [' || v_active_multiplier || 'x: ' || v_base_xp || ' + ' || v_bonus_xp || ' bonus]';
  ELSE
    v_xp_description := 'Day ' || v_new_streak || ' streak reward';
  END IF;

  -- Log XP transaction
  IF v_xp_earned > 0 THEN
    BEGIN
      INSERT INTO public.xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_xp_earned, 'daily_login', v_xp_description);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Update multiplier tracking if active
  IF v_multiplier_record IS NOT NULL AND v_bonus_xp > 0 THEN
    BEGIN
      UPDATE public.user_xp_multipliers
      SET 
        xp_earned_with_multiplier = COALESCE(xp_earned_with_multiplier, 0) + v_bonus_xp,
        updated_at = NOW()
      WHERE id = v_multiplier_record.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Log daily login
  BEGIN
    INSERT INTO public.daily_logins (user_id, login_date, day_of_streak, xp_earned, bonus_reward)
    VALUES (p_user_id, v_today, v_new_streak, v_xp_earned, v_bonus_reward)
    ON CONFLICT (user_id, login_date) DO NOTHING;
  EXCEPTION
    WHEN undefined_column THEN
      INSERT INTO public.daily_logins (user_id, login_date, streak_day, xp_earned, bonus_spin)
      VALUES (p_user_id, v_today, v_new_streak, v_xp_earned, v_free_spin_earned)
      ON CONFLICT (user_id, login_date) DO NOTHING;
    WHEN OTHERS THEN
      NULL;
  END;

  -- Apply XP multiplier on day 4
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
    'base_xp', v_base_xp,
    'bonus_xp', v_bonus_xp,
    'xp_multiplier', v_active_multiplier,
    'free_spin_earned', v_free_spin_earned,
    'multiplier_applied', v_multiplier_applied,
    'longest_streak', v_longest_streak,
    'bonus_reward', v_bonus_reward
  );
END;
$$;

-- Wrapper function
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.claim_daily_reward_v2(p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward(UUID) TO authenticated;


