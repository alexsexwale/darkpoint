-- ============================================
-- Migration 038: Fix Spin Wheel XP Multiplier
-- ============================================
-- The spin wheel was not applying active XP multipliers to XP prizes.
-- This migration updates spin_wheel_v3 to use the add_xp function
-- which properly applies XP multipliers.

CREATE OR REPLACE FUNCTION spin_wheel_v3(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user user_profiles%ROWTYPE;
  v_prize spin_prizes%ROWTYPE;
  v_new_spins INTEGER;
  v_new_xp INTEGER;
  v_coupon_id UUID;
  v_spin_result JSON;
  v_multiplier_result JSON;
  v_add_xp_result JSONB;
  v_final_xp INTEGER;
  v_bonus_xp INTEGER;
  v_multiplier_applied NUMERIC;
BEGIN
  -- Get user profile
  SELECT * INTO v_user FROM user_profiles WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_user.available_spins <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No spins available');
  END IF;
  
  -- Select random prize based on probability
  SELECT * INTO v_prize
  FROM spin_prizes
  WHERE is_active = true
  ORDER BY RANDOM() * (1.0 / probability)
  LIMIT 1;
  
  IF v_prize IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No prizes available');
  END IF;
  
  -- Deduct spin
  v_new_spins := v_user.available_spins - 1;
  
  -- Process prize based on type
  BEGIN
    CASE v_prize.prize_type
      WHEN 'xp' THEN
        -- Use add_xp function to properly apply XP multipliers!
        SELECT add_xp(
          p_user_id,
          COALESCE(v_prize.prize_value::INTEGER, 0),
          'spin_reward',
          'Spin Wheel: ' || v_prize.name
        ) INTO v_add_xp_result;
        
        -- Get the actual XP awarded (with multiplier)
        v_final_xp := COALESCE((v_add_xp_result->>'total_xp_earned')::INTEGER, v_prize.prize_value::INTEGER);
        v_bonus_xp := COALESCE((v_add_xp_result->>'bonus_xp')::INTEGER, 0);
        v_multiplier_applied := COALESCE((v_add_xp_result->>'multiplier_applied')::NUMERIC, 1);
        
        -- Only update spins (XP already updated by add_xp)
        UPDATE user_profiles 
        SET available_spins = v_new_spins, updated_at = NOW()
        WHERE id = p_user_id;
        
      WHEN 'spin' THEN
        v_new_spins := v_new_spins + COALESCE(v_prize.prize_value::INTEGER, 1);
        UPDATE user_profiles 
        SET available_spins = v_new_spins, updated_at = NOW()
        WHERE id = p_user_id;
        
      WHEN 'discount' THEN
        -- Create discount coupon with generated code
        INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
        VALUES (
          p_user_id,
          'SPIN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
          'percent',
          v_prize.prize_value::INTEGER,
          0,
          'spin_wheel',
          '🎰 Spin Win: ' || v_prize.name,
          NOW() + INTERVAL '60 days'
        )
        RETURNING id INTO v_coupon_id;
        
        UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
        
      WHEN 'xp_multiplier' THEN
        -- Grant XP multiplier
        BEGIN
          SELECT grant_xp_multiplier(
            p_user_id,
            COALESCE(v_prize.multiplier_value, 1.5),
            24,
            'spin_wheel',
            v_prize.name
          ) INTO v_multiplier_result;
        EXCEPTION WHEN OTHERS THEN
          -- If grant_xp_multiplier fails, just continue
          RAISE WARNING 'Could not grant XP multiplier: %', SQLERRM;
        END;
        
        UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
        
      WHEN 'credit' THEN
        UPDATE user_profiles 
        SET 
          store_credit = store_credit + COALESCE(v_prize.prize_value::DECIMAL, 0),
          available_spins = v_new_spins,
          updated_at = NOW()
        WHERE id = p_user_id;
        
      WHEN 'shipping' THEN
        -- Create free shipping coupon
        INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
        VALUES (
          p_user_id,
          'SHIP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
          'shipping',
          100, -- 100% off shipping
          0,
          'spin_wheel',
          '🚚 Spin Win: ' || v_prize.name,
          NOW() + INTERVAL '30 days'
        )
        RETURNING id INTO v_coupon_id;
        
        UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
        
      ELSE
        -- Default: just deduct spin
        UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error processing spin prize: %', SQLERRM;
    -- Still deduct the spin even if prize processing fails
    UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
  END;
  
  -- Log the spin
  BEGIN
    INSERT INTO spin_history (user_id, prize_id, prize_name, prize_type, prize_value)
    VALUES (p_user_id, v_prize.id, v_prize.name, v_prize.prize_type, v_prize.prize_value);
  EXCEPTION WHEN undefined_table THEN
    -- spin_history table doesn't exist, skip logging
    NULL;
  END;
  
  -- Build response with multiplier info for XP prizes
  IF v_prize.prize_type = 'xp' AND v_multiplier_applied > 1 THEN
    RETURN json_build_object(
      'success', true,
      'prize', json_build_object(
        'id', v_prize.id,
        'name', v_prize.name,
        'description', v_prize.description,
        'prize_type', v_prize.prize_type,
        'prize_value', v_final_xp::TEXT, -- Return actual XP awarded (with multiplier)
        'color', v_prize.color,
        'probability', v_prize.probability,
        'is_active', v_prize.is_active
      ),
      'base_xp', v_prize.prize_value::INTEGER,
      'bonus_xp', v_bonus_xp,
      'multiplier', v_multiplier_applied,
      'spins_remaining', v_new_spins,
      'coupon_id', v_coupon_id
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'prize', json_build_object(
        'id', v_prize.id,
        'name', v_prize.name,
        'description', v_prize.description,
        'prize_type', v_prize.prize_type,
        'prize_value', v_prize.prize_value,
        'color', v_prize.color,
        'probability', v_prize.probability,
        'is_active', v_prize.is_active
      ),
      'spins_remaining', v_new_spins,
      'coupon_id', v_coupon_id
    );
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION spin_wheel_v3(UUID) TO authenticated;

-- Also update spin_wheel wrapper to use v3
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN spin_wheel_v3(p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Spin wheel XP multiplier fix applied!';
  RAISE NOTICE 'XP prizes from the spin wheel will now:';
  RAISE NOTICE '  - Apply active XP multipliers (e.g., 2x boost)';
  RAISE NOTICE '  - Track bonus XP earned';
  RAISE NOTICE '  - Include multiplier info in response';
END $$;

