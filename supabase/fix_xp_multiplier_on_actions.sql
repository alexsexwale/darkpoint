-- Fix XP Multiplier Application
-- This script updates the add_xp function to apply active XP multipliers

-- Drop existing function
DROP FUNCTION IF EXISTS add_xp(UUID, INTEGER, TEXT, TEXT);

-- Create updated add_xp function that applies XP multiplier
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_new_total INTEGER;
  v_new_level INTEGER;
  v_old_level INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_multiplier NUMERIC := 1;
  v_multiplier_id UUID;
  v_final_amount INTEGER;
  v_bonus_xp INTEGER := 0;
  v_final_description TEXT;
  v_reward_result JSONB;
BEGIN
  -- Get current profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  v_old_level := COALESCE(v_profile.level, 1);
  
  -- Check for active XP multiplier (only for positive XP gains)
  IF p_amount > 0 THEN
    SELECT 
      m.id,
      COALESCE(m.multiplier, 1)
    INTO v_multiplier_id, v_multiplier
    FROM user_xp_multipliers m
    WHERE m.user_id = p_user_id
      AND m.is_active = TRUE
      AND m.expires_at > NOW()
    ORDER BY m.multiplier DESC
    LIMIT 1;
    
    -- Apply multiplier
    IF v_multiplier > 1 THEN
      v_final_amount := ROUND(p_amount * v_multiplier);
      v_bonus_xp := v_final_amount - p_amount;
    ELSE
      v_final_amount := p_amount;
    END IF;
  ELSE
    v_final_amount := p_amount;
  END IF;
  
  -- Calculate new total
  v_new_total := COALESCE(v_profile.total_xp, 0) + v_final_amount;
  IF v_new_total < 0 THEN
    v_new_total := 0;
  END IF;
  
  -- Calculate new level (100 XP per level, minimum level 1)
  v_new_level := GREATEST(1, FLOOR(v_new_total / 100) + 1);
  v_leveled_up := v_new_level > v_old_level;
  
  -- Update profile
  UPDATE user_profiles SET
    total_xp = v_new_total,
    level = v_new_level,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Build description with multiplier info
  IF v_multiplier > 1 AND v_bonus_xp > 0 THEN
    v_final_description := COALESCE(p_description, '') || ' [' || v_multiplier || 'x: ' || p_amount || ' + ' || v_bonus_xp || ' bonus]';
    
    -- Update multiplier tracking
    UPDATE user_xp_multipliers SET
      xp_earned_with_multiplier = COALESCE(xp_earned_with_multiplier, 0) + v_bonus_xp,
      updated_at = NOW()
    WHERE id = v_multiplier_id;
  ELSE
    v_final_description := p_description;
  END IF;
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description, created_at)
  VALUES (p_user_id, v_final_amount, p_action::xp_action, v_final_description, NOW());
  
  -- Handle level up rewards
  IF v_leveled_up THEN
    v_reward_result := grant_levelup_reward(p_user_id, v_new_level);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'base_xp', p_amount,
    'bonus_xp', v_bonus_xp,
    'total_xp_earned', v_final_amount,
    'multiplier_applied', v_multiplier,
    'new_total', v_new_total,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'levelup_reward', COALESCE(v_reward_result, '{}'::jsonb)
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in add_xp: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ add_xp function updated to apply XP multipliers!';
  RAISE NOTICE 'The function now:';
  RAISE NOTICE '  - Checks for active XP multiplier';
  RAISE NOTICE '  - Applies multiplier to positive XP gains';
  RAISE NOTICE '  - Logs multiplier info in transaction description';
  RAISE NOTICE '  - Tracks bonus XP earned with multiplier';
END $$;

