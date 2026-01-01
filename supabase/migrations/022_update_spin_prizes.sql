-- ===========================================
-- Update Spin Prizes: Add 2 Free Spins + 2 Discounts
-- Replace lowest XP rewards
-- ===========================================

-- Deactivate the old low XP prizes we're replacing
UPDATE spin_prizes SET is_active = false WHERE id IN ('xp_10', 'xp_25');

-- Insert/Update the new prize configuration
INSERT INTO spin_prizes (id, name, description, prize_type, prize_value, probability, color, is_active) VALUES
  -- 2 Discount prizes (replacing xp_10 and xp_25)
  ('discount_5', '5% Off!', 'Nice! 5% discount on your next order!', 'discount', '5', 15, '#6b7280', true),
  ('discount_10', '10% Off!', 'Great! 10% discount on your next order!', 'discount', '10', 10, '#22c55e', true),
  
  -- 2 Free Spin prizes
  ('spin_bonus', 'Free Spin!', 'Lucky you! Another free spin!', 'spin', '1', 8, '#ef4444', true),
  ('spin_bonus_2', 'Bonus Spin!', 'Score! One more spin coming your way!', 'spin', '1', 7, '#f97316', true),
  
  -- XP prizes (remaining)
  ('xp_50', '+50 XP', 'Awesome! 50 XP for you!', 'xp', '50', 20, '#3b82f6', true),
  ('xp_75', '+75 XP', 'Lucky! 75 XP bonus!', 'xp', '75', 15, '#8b5cf6', true),
  ('xp_100', '+100 XP', 'Amazing! 100 XP jackpot!', 'xp', '100', 10, '#a855f7', true),
  ('xp_150', '+150 XP', 'Incredible! 150 XP mega bonus!', 'xp', '150', 6, '#ec4899', true),
  ('xp_250', '+250 XP', 'EPIC! 250 XP legendary spin!', 'xp', '250', 4, '#f59e0b', true),
  ('xp_500', '+500 XP', 'JACKPOT! 500 XP ultra rare!', 'xp', '500', 2, '#fbbf24', true),
  
  -- Super rare XP multiplier (3%)
  ('multiplier_2x', '2x XP Boost!', 'LEGENDARY! 2x XP for 24 hours!', 'xp_multiplier', '2', 3, '#dc2626', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prize_type = EXCLUDED.prize_type,
  prize_value = EXCLUDED.prize_value,
  probability = EXCLUDED.probability,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active;

-- Update the spin_wheel function to handle discount prizes properly
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_prize spin_prizes%ROWTYPE;
  v_random DECIMAL;
  v_cumulative DECIMAL := 0;
  v_coupon_code TEXT;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user has spins
  IF v_profile.available_spins <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No spins available');
  END IF;
  
  -- Deduct spin first
  UPDATE user_profiles SET available_spins = available_spins - 1 WHERE id = p_user_id;
  
  -- Select random prize based on probability (only active prizes)
  v_random := random() * 100;
  
  FOR v_prize IN 
    SELECT * FROM spin_prizes WHERE is_active = true ORDER BY probability DESC
  LOOP
    v_cumulative := v_cumulative + v_prize.probability;
    IF v_random <= v_cumulative THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Record the spin
  INSERT INTO spin_history (user_id, prize_id)
  VALUES (p_user_id, v_prize.id);
  
  -- Apply prize immediately based on type
  CASE v_prize.prize_type::TEXT
    WHEN 'xp' THEN
      UPDATE user_profiles SET total_xp = total_xp + v_prize.prize_value::INTEGER WHERE id = p_user_id;
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_prize.prize_value::INTEGER, 'spin_reward', 'Spin wheel prize: ' || v_prize.name);
      
    WHEN 'spin' THEN
      UPDATE user_profiles SET available_spins = available_spins + v_prize.prize_value::INTEGER WHERE id = p_user_id;
      
    WHEN 'discount' THEN
      -- Create a discount coupon for the user
      v_coupon_code := 'SPIN-' || UPPER(SUBSTRING(MD5(random()::text || NOW()::text) FROM 1 FOR 8));
      
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, expires_at)
      VALUES (
        p_user_id,
        v_coupon_code,
        'percent'::discount_type,
        v_prize.prize_value::DECIMAL,
        0, -- No minimum order
        'spin_wheel'::coupon_source,
        NOW() + INTERVAL '30 days'
      );
      
    WHEN 'xp_multiplier' THEN
      -- Grant XP multiplier for 24 hours
      PERFORM grant_xp_multiplier(
        p_user_id, 
        v_prize.prize_value::DECIMAL, 
        24, 
        'spin_wheel', 
        'Spin Wheel Prize: ' || v_prize.prize_value || 'x XP for 24 hours!'
      );
      
    ELSE
      -- For any legacy types, just give 25 XP as fallback
      UPDATE user_profiles SET total_xp = total_xp + 25 WHERE id = p_user_id;
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, 25, 'spin_reward', 'Spin wheel bonus XP');
  END CASE;
  
  v_result := json_build_object(
    'success', true,
    'prize', json_build_object(
      'id', v_prize.id,
      'name', v_prize.name,
      'description', v_prize.description,
      'prize_type', v_prize.prize_type,
      'prize_value', v_prize.prize_value,
      'color', v_prize.color
    ),
    'coupon_code', v_coupon_code,
    'remaining_spins', v_profile.available_spins - 1
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure 'spin_wheel' is a valid coupon_source
DO $$
BEGIN
  -- Try to add the new enum value for coupon source
  ALTER TYPE coupon_source ADD VALUE IF NOT EXISTS 'spin_wheel';
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if already exists or enum doesn't exist
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;

