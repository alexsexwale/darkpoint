-- ===========================================
-- Remove Costly Prizes - XP Only System
-- No real money, no mystery gifts, no store credit
-- ===========================================

-- Step 1: Add 'xp_multiplier' to the prize_type enum if it doesn't exist
DO $$
BEGIN
  -- Try to add the new enum value
  ALTER TYPE prize_type ADD VALUE IF NOT EXISTS 'xp_multiplier';
EXCEPTION WHEN OTHERS THEN
  -- If prize_type is not an enum or doesn't exist, try dropping/adding constraint instead
  BEGIN
    ALTER TABLE spin_prizes DROP CONSTRAINT IF EXISTS spin_prizes_prize_type_check;
    ALTER TABLE spin_prizes ADD CONSTRAINT spin_prizes_prize_type_check 
      CHECK (prize_type IN ('discount', 'xp', 'shipping', 'credit', 'spin', 'mystery', 'xp_multiplier'));
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if this also fails
  END;
END $$;

-- Step 2: Insert new XP-focused spin prizes FIRST (so they exist for foreign key updates)
-- Using ON CONFLICT to update if they already exist
INSERT INTO spin_prizes (id, name, description, prize_type, prize_value, probability, color, is_active) VALUES
  -- Common XP prizes (60% total)
  ('xp_10', '+10 XP', 'Nice! You earned 10 bonus XP!', 'xp', '10', 20, '#6b7280', true),
  ('xp_25', '+25 XP', 'Great spin! 25 XP added!', 'xp', '25', 20, '#22c55e', true),
  ('xp_50', '+50 XP', 'Awesome! 50 XP for you!', 'xp', '50', 15, '#3b82f6', true),
  
  -- Uncommon XP prizes (25% total)
  ('xp_75', '+75 XP', 'Lucky! 75 XP bonus!', 'xp', '75', 10, '#8b5cf6', true),
  ('xp_100', '+100 XP', 'Amazing! 100 XP jackpot!', 'xp', '100', 8, '#a855f7', true),
  ('xp_150', '+150 XP', 'Incredible! 150 XP mega bonus!', 'xp', '150', 5, '#ec4899', true),
  
  -- Rare prizes (13% total)
  ('xp_250', '+250 XP', 'EPIC! 250 XP legendary spin!', 'xp', '250', 3, '#f59e0b', true),
  ('spin_bonus', 'Free Spin!', 'Lucky you! Another free spin!', 'spin', '1', 6, '#ef4444', true),
  ('xp_500', '+500 XP', 'JACKPOT! 500 XP ultra rare!', 'xp', '500', 1, '#fbbf24', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prize_type = EXCLUDED.prize_type,
  prize_value = EXCLUDED.prize_value,
  probability = EXCLUDED.probability,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active;

-- Step 3: Update spin_history to point to 'xp_50' for any old prize types
-- Now xp_50 definitely exists from Step 2
UPDATE spin_history 
SET prize_id = 'xp_50' 
WHERE prize_id IN (
  SELECT id FROM spin_prizes 
  WHERE prize_type IN ('discount', 'shipping', 'credit', 'mystery')
);

-- Step 4: Deactivate all old costly prizes (keep them for any remaining foreign key integrity)
UPDATE spin_prizes 
SET is_active = false 
WHERE prize_type IN ('discount', 'shipping', 'credit', 'mystery');

-- Step 5: Update the spin_wheel function to handle xp_multiplier prizes
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_prize spin_prizes%ROWTYPE;
  v_random DECIMAL;
  v_cumulative DECIMAL := 0;
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
    'remaining_spins', v_profile.available_spins - 1
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;
