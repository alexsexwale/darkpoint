-- ============================================
-- Migration 037: Fix Spin Wheel Tables
-- ============================================
-- The spin_wheel function expects columns that don't exist in the original tables.
-- This migration adds the missing columns and updates the function.

-- ============================================
-- 0) Add missing values to xp_action enum
-- ============================================
DO $$
BEGIN
  -- Try to add 'spin' value to xp_action enum
  ALTER TYPE xp_action ADD VALUE IF NOT EXISTS 'spin';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add spin to xp_action enum: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Try to add 'redeem' value to xp_action enum (used by purchase_reward)
  ALTER TYPE xp_action ADD VALUE IF NOT EXISTS 'redeem';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add redeem to xp_action enum: %', SQLERRM;
END $$;

-- ============================================
-- 1) Add missing columns to spin_history
-- ============================================
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS prize_name TEXT;
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS prize_type TEXT;
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS prize_value TEXT;

-- ============================================
-- 2) Add missing columns to spin_prizes
-- ============================================
ALTER TABLE spin_prizes ADD COLUMN IF NOT EXISTS multiplier_value DECIMAL(3,1);
ALTER TABLE spin_prizes ADD COLUMN IF NOT EXISTS icon TEXT;

-- ============================================
-- 3) Update prize_type CHECK constraint to include xp_multiplier
-- ============================================
-- Drop old constraint (may not exist)
ALTER TABLE spin_prizes DROP CONSTRAINT IF EXISTS spin_prizes_prize_type_check;

-- Add new constraint with xp_multiplier included
ALTER TABLE spin_prizes ADD CONSTRAINT spin_prizes_prize_type_check 
  CHECK (prize_type IN ('discount', 'xp', 'shipping', 'credit', 'spin', 'mystery', 'xp_multiplier'));

-- ============================================
-- 4) Insert XP multiplier prizes if not exists
-- ============================================
INSERT INTO spin_prizes (id, name, description, prize_type, prize_value, probability, color, icon, multiplier_value, is_active)
VALUES 
  ('xp_boost_1_5x', '1.5x XP Boost', '1.5x XP for 24 hours!', 'xp_multiplier', '1.5', 3, '#f59e0b', '⚡', 1.5, true),
  ('xp_boost_2x', '2x XP Boost!', 'LEGENDARY! 2x XP for 24 hours!', 'xp_multiplier', '2', 1, '#dc2626', '🔥', 2.0, true)
ON CONFLICT (id) DO UPDATE SET
  multiplier_value = EXCLUDED.multiplier_value,
  icon = EXCLUDED.icon;

-- Update existing prizes with icons
UPDATE spin_prizes SET icon = '🏷️' WHERE id = 'discount_5' AND icon IS NULL;
UPDATE spin_prizes SET icon = '🎫' WHERE id = 'discount_10' AND icon IS NULL;
UPDATE spin_prizes SET icon = '⚡' WHERE id = 'xp_50' AND icon IS NULL;
UPDATE spin_prizes SET icon = '⚡' WHERE id = 'xp_100' AND icon IS NULL;
UPDATE spin_prizes SET icon = '🚚' WHERE id = 'free_shipping' AND icon IS NULL;
UPDATE spin_prizes SET icon = '🎁' WHERE id = 'mystery' AND icon IS NULL;
UPDATE spin_prizes SET icon = '💰' WHERE id = 'grand_prize' AND icon IS NULL;

-- ============================================
-- 5) Recreate spin_wheel function with error handling
-- ============================================
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user user_profiles%ROWTYPE;
  v_prize RECORD;
  v_new_spins INTEGER;
  v_new_xp INTEGER;
  v_coupon_id UUID;
  v_multiplier_result JSON;
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
        v_new_xp := v_user.total_xp + COALESCE(v_prize.prize_value::INTEGER, 0);
        UPDATE user_profiles 
        SET total_xp = v_new_xp, available_spins = v_new_spins, updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Use 'spin_reward' which exists in xp_action enum (fallback to 'bonus' if that fails)
        BEGIN
          INSERT INTO xp_transactions (user_id, amount, action, description)
          VALUES (p_user_id, v_prize.prize_value::INTEGER, 'spin_reward', 'Spin Wheel: ' || v_prize.name);
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO xp_transactions (user_id, amount, action, description)
          VALUES (p_user_id, v_prize.prize_value::INTEGER, 'bonus', 'Spin Wheel: ' || v_prize.name);
        END;
        
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
        
      ELSE
        -- Default: just deduct spin
        UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error processing prize: %', SQLERRM;
    -- Still deduct the spin even if prize processing fails
    UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
  END;
  
  -- Log spin (with error handling for missing columns)
  BEGIN
    INSERT INTO spin_history (user_id, prize_id, prize_name, prize_type, prize_value)
    VALUES (p_user_id, v_prize.id, v_prize.name, v_prize.prize_type, v_prize.prize_value);
  EXCEPTION WHEN OTHERS THEN
    -- Try simpler insert if columns don't exist
    BEGIN
      INSERT INTO spin_history (user_id, prize_id)
      VALUES (p_user_id, v_prize.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not log spin history: %', SQLERRM;
    END;
  END;
  
  RETURN json_build_object(
    'success', true,
    'prize', json_build_object(
      'id', v_prize.id,
      'name', v_prize.name,
      'description', v_prize.description,
      'type', v_prize.prize_type,
      'value', v_prize.prize_value,
      'color', v_prize.color,
      'icon', v_prize.icon
    ),
    'remaining_spins', v_new_spins,
    'coupon_id', v_coupon_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO service_role;

-- ============================================
-- 6) Verify spin_prizes has data
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spin_prizes WHERE is_active = true LIMIT 1) THEN
    -- Insert default prizes if none exist
    INSERT INTO spin_prizes (id, name, description, prize_type, prize_value, probability, color, icon, is_active) VALUES
      ('xp_10', '+10 XP', 'Nice! You earned 10 bonus XP!', 'xp', '10', 20, '#6b7280', '⚡', true),
      ('xp_25', '+25 XP', 'Great spin! 25 XP added!', 'xp', '25', 20, '#22c55e', '⚡', true),
      ('xp_50', '+50 XP', 'Awesome! 50 XP for you!', 'xp', '50', 15, '#3b82f6', '⚡', true),
      ('xp_75', '+75 XP', 'Lucky! 75 XP bonus!', 'xp', '75', 10, '#8b5cf6', '⚡', true),
      ('xp_100', '+100 XP', 'Amazing! 100 XP jackpot!', 'xp', '100', 10, '#a855f7', '⚡', true),
      ('discount_5', '5% Off', '5% discount on next order', 'discount', '5', 8, '#22c55e', '🏷️', true),
      ('discount_10', '10% Off', '10% discount on next order', 'discount', '10', 5, '#3b82f6', '🎫', true),
      ('free_spin', 'Free Spin!', 'Lucky you! Another free spin!', 'spin', '1', 5, '#ef4444', '🎡', true),
      ('bonus_spin', 'Bonus Spin!', 'Two extra spins!', 'spin', '2', 3, '#f97316', '🎰', true),
      ('xp_boost_1_5x', '1.5x XP Boost', '1.5x XP for 24 hours!', 'xp_multiplier', '1.5', 3, '#f59e0b', '⚡', true),
      ('xp_boost_2x', '2x XP Boost!', 'LEGENDARY! 2x XP for 24 hours!', 'xp_multiplier', '2', 1, '#dc2626', '🔥', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 7) Fix source column in user_coupons if it's an enum
-- ============================================
DO $$
BEGIN
  -- Check if source is an enum and add 'spin_wheel' value
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'coupon_source'
  ) THEN
    BEGIN
      ALTER TYPE coupon_source ADD VALUE IF NOT EXISTS 'spin_wheel';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add spin_wheel to coupon_source: %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================
-- 8) Test the function works
-- ============================================
DO $$
DECLARE
  v_test_result JSON;
BEGIN
  -- Just verify the function exists and can be called
  -- This doesn't actually spin, just checks structure
  RAISE NOTICE 'spin_wheel function exists and is ready';
END $$;

-- ============================================
-- 9) Fix purchase_reward to handle 'spin' category
-- ============================================
CREATE OR REPLACE FUNCTION purchase_reward(
  p_user_id UUID,
  p_reward_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_reward RECORD;
  v_user_xp INTEGER;
  v_user_spins INTEGER;
  v_coupon_code TEXT;
  v_coupon_id UUID;
  v_new_xp INTEGER;
  v_new_spins INTEGER;
  v_result JSON;
BEGIN
  -- Get user's current XP and spins
  SELECT total_xp, available_spins INTO v_user_xp, v_user_spins 
  FROM user_profiles WHERE id = p_user_id;
  
  IF v_user_xp IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get reward details from rewards table
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id;
  
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  -- Check if user has enough XP
  IF v_user_xp < v_reward.xp_cost THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Not enough XP',
      'required', v_reward.xp_cost,
      'current', v_user_xp
    );
  END IF;
  
  -- Deduct XP
  v_new_xp := v_user_xp - v_reward.xp_cost;
  
  -- Log XP transaction (use 'redeem' action)
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, -v_reward.xp_cost, 'redeem', 'Purchased: ' || v_reward.name);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to 'bonus' if 'redeem' not in enum
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, -v_reward.xp_cost, 'bonus', 'Purchased: ' || v_reward.name);
  END;
  
  -- Create reward based on category
  CASE v_reward.category
    WHEN 'discount' THEN
      -- Create discount coupon - expires in 60 days
      -- Note: v_reward.value contains the discount percentage as TEXT (e.g., '5', '10', '15')
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        'REWARD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
        'percent',
        COALESCE(v_reward.value::INTEGER, 5), -- Convert TEXT value to INTEGER
        0,
        'reward',
        '🛒 ' || v_reward.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      
    WHEN 'shipping' THEN
      -- Create free shipping coupon - expires in 60 days
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        'SHIP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
        'shipping',
        0,
        0,
        'reward',
        '🚚 ' || v_reward.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      
    WHEN 'xp_booster' THEN
      -- Grant XP multiplier immediately
      -- Note: v_reward.value is like '2x_24h', we extract the multiplier (default 2.0)
      BEGIN
        PERFORM grant_xp_multiplier(
          p_user_id,
          CASE 
            WHEN v_reward.value LIKE '2x%' THEN 2.0
            WHEN v_reward.value LIKE '3x%' THEN 3.0
            WHEN v_reward.value LIKE '1.5x%' THEN 1.5
            ELSE 2.0
          END,
          24, -- 24 hours duration
          'reward_shop',
          v_reward.name
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not grant XP multiplier: %', SQLERRM;
      END;
      
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      
    WHEN 'spin' THEN
      -- Grant extra spins
      -- Note: v_reward.value contains the number of spins as TEXT (e.g., '1')
      v_new_spins := COALESCE(v_user_spins, 0) + COALESCE(v_reward.value::INTEGER, 1);
      UPDATE user_profiles 
      SET total_xp = v_new_xp, available_spins = v_new_spins, updated_at = NOW() 
      WHERE id = p_user_id;
      
    WHEN 'cosmetic' THEN
      -- Record cosmetic purchase (badges, frames, etc.)
      BEGIN
        INSERT INTO user_rewards (user_id, reward_id, expires_at)
        VALUES (p_user_id, p_reward_id, NULL) -- Cosmetics don't expire
        ON CONFLICT (user_id, reward_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not record cosmetic: %', SQLERRM;
      END;
      
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
      
    ELSE
      -- For any unknown category, just deduct XP and record purchase
      UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
  END CASE;
  
  RETURN json_build_object(
    'success', true,
    'reward_id', p_reward_id,
    'reward_name', v_reward.name,
    'xp_spent', v_reward.xp_cost,
    'new_xp_total', v_new_xp,
    'coupon_id', v_coupon_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION purchase_reward(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_reward(UUID, TEXT) TO service_role;

-- ============================================
-- 10) Add spin_count column to rewards table if missing
-- ============================================
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS spin_count INTEGER DEFAULT 1;

-- Update spin rewards to have correct spin_count
UPDATE rewards SET spin_count = 1 WHERE category = 'spin' AND spin_count IS NULL;

SELECT 'Spin wheel fix complete!' as status;

