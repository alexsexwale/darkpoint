-- Quick fix: Create a simple daily reward function
-- Run this FIRST before anything else

-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS claim_daily_reward_v2(UUID);
DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

-- Create a simplified daily reward function
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_new_streak INTEGER;
  v_xp_earned INTEGER := 5;
BEGIN
  -- Get or create user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create minimal profile
    INSERT INTO user_profiles (id, username, total_xp, current_level, current_streak, available_spins)
    VALUES (p_user_id, 'user_' || LEFT(p_user_id::TEXT, 8), 100, 1, 0, 1)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Could not create profile');
    END IF;
  END IF;
  
  -- Check if already claimed today
  IF v_profile.last_login_date = v_today THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Already claimed today',
      'streak', COALESCE(v_profile.current_streak, 1)
    );
  END IF;
  
  -- Calculate streak
  IF v_profile.last_login_date = v_today - 1 THEN
    v_new_streak := COALESCE(v_profile.current_streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Update profile
  UPDATE user_profiles SET
    last_login_date = v_today,
    current_streak = v_new_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
    total_xp = COALESCE(total_xp, 0) + v_xp_earned
  WHERE id = p_user_id;
  
  -- Log XP
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, v_xp_earned, 'daily_login', 'Daily login reward')
  ON CONFLICT DO NOTHING;
  
  -- Log daily login
  INSERT INTO daily_logins (user_id, login_date, day_of_streak, xp_earned)
  VALUES (p_user_id, v_today, v_new_streak, v_xp_earned)
  ON CONFLICT (user_id, login_date) DO NOTHING;
  
  RETURN json_build_object(
    'success', true,
    'streak', v_new_streak,
    'cycle_day', ((v_new_streak - 1) % 7) + 1,
    'xp_earned', v_xp_earned,
    'free_spin_earned', false,
    'multiplier_applied', false
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create v2 alias
CREATE OR REPLACE FUNCTION claim_daily_reward_v2(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN claim_daily_reward(p_user_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION claim_daily_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_reward_v2(UUID) TO authenticated;

-- Quick test (replace with your user ID if you want to test)
-- SELECT claim_daily_reward('your-user-id-here');

SELECT 'Daily reward functions created successfully!' as status;

