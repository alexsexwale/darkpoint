-- ==============================================
-- COMPREHENSIVE FIX FOR ALL PURCHASE ISSUES
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Ensure all required columns exist on user_profiles
DO $$
BEGIN
  -- Add wishlist_count column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'wishlist_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN wishlist_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added wishlist_count column';
  END IF;

  -- Add last_purchase_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_purchase_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_purchase_at TIMESTAMPTZ DEFAULT NULL;
    RAISE NOTICE 'Added last_purchase_at column';
  END IF;

  -- Ensure other columns have defaults
  ALTER TABLE user_profiles ALTER COLUMN total_xp SET DEFAULT 0;
  ALTER TABLE user_profiles ALTER COLUMN total_orders SET DEFAULT 0;
  ALTER TABLE user_profiles ALTER COLUMN total_spent SET DEFAULT 0;
  ALTER TABLE user_profiles ALTER COLUMN referral_count SET DEFAULT 0;
  ALTER TABLE user_profiles ALTER COLUMN total_referrals SET DEFAULT 0;
END $$;

-- 2. Ensure user_coupons has all required columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_coupons' AND column_name = 'used_on_order_id'
  ) THEN
    ALTER TABLE user_coupons ADD COLUMN used_on_order_id UUID DEFAULT NULL;
    RAISE NOTICE 'Added used_on_order_id column to user_coupons';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_coupons' AND column_name = 'used_at'
  ) THEN
    ALTER TABLE user_coupons ADD COLUMN used_at TIMESTAMPTZ DEFAULT NULL;
    RAISE NOTICE 'Added used_at column to user_coupons';
  END IF;
END $$;

-- 3. Drop and recreate check_achievements to handle missing columns gracefully
DROP FUNCTION IF EXISTS check_achievements(UUID);

CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_achievement RECORD;
  v_existing RECORD;
  v_unlocked_count INTEGER := 0;
  v_current_value INTEGER;
BEGIN
  -- Get user profile with safe column access
  SELECT 
    COALESCE(total_orders, 0) as total_orders,
    COALESCE(total_spent, 0) as total_spent,
    COALESCE(total_referrals, 0) as total_referrals,
    COALESCE(referral_count, 0) as referral_count,
    COALESCE(wishlist_count, 0) as wishlist_count,
    COALESCE(total_xp, 0) as total_xp
  INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Loop through all achievements
  FOR v_achievement IN 
    SELECT * FROM achievements WHERE is_active = true
  LOOP
    -- Determine current progress based on requirement type
    v_current_value := CASE v_achievement.requirement_type
      WHEN 'purchase_count' THEN v_profile.total_orders
      WHEN 'total_spent' THEN v_profile.total_spent
      WHEN 'wishlist_count' THEN v_profile.wishlist_count
      WHEN 'referral_count' THEN v_profile.referral_count
      ELSE 0
    END;

    -- Check if already exists
    SELECT * INTO v_existing
    FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;

    IF v_existing IS NULL THEN
      -- Only insert if requirement is met
      IF v_current_value >= v_achievement.requirement_value AND v_achievement.requirement_value > 0 THEN
        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at, created_at, updated_at)
        VALUES (p_user_id, v_achievement.id, v_current_value, NOW(), NOW(), NOW());
        
        -- Award XP for achievement
        IF v_achievement.xp_reward > 0 THEN
          UPDATE user_profiles 
          SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward 
          WHERE id = p_user_id;
          
          INSERT INTO xp_transactions (user_id, amount, action, description)
          VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
        END IF;
        
        v_unlocked_count := v_unlocked_count + 1;
      END IF;
    ELSE
      -- Update progress if changed (without unlocking again)
      IF v_existing.progress != v_current_value THEN
        UPDATE user_achievements
        SET progress = v_current_value,
            updated_at = NOW(),
            unlocked_at = CASE 
              WHEN v_existing.unlocked_at IS NULL AND v_current_value >= v_achievement.requirement_value 
              THEN NOW() 
              ELSE v_existing.unlocked_at 
            END
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'unlocked', v_unlocked_count);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'check_achievements error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to process purchase rewards (can be called manually)
DROP FUNCTION IF EXISTS process_purchase_rewards(UUID, UUID);

CREATE OR REPLACE FUNCTION process_purchase_rewards(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_profile RECORD;
  v_xp_amount INTEGER;
  v_order_total NUMERIC;
  v_pending_referral RECORD;
  v_referrer_profile RECORD;
  v_referrer_xp INTEGER;
  v_result JSONB := '{}';
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Check if rewards already processed
  IF v_order.rewards_processed = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rewards already processed');
  END IF;

  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Calculate XP (1 XP per R10 spent, minimum 10 XP)
  v_order_total := v_order.total - COALESCE(v_order.discount_amount, 0);
  v_xp_amount := GREATEST(FLOOR(v_order_total / 10), 10);

  -- 1. Update user profile stats
  UPDATE user_profiles
  SET 
    total_xp = COALESCE(total_xp, 0) + v_xp_amount,
    total_orders = COALESCE(total_orders, 0) + 1,
    total_spent = COALESCE(total_spent, 0) + v_order_total,
    last_purchase_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 2. Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, v_xp_amount, 'purchase', 'Purchase: Order ' || v_order.order_number);

  v_result := v_result || jsonb_build_object('xp_awarded', v_xp_amount);

  -- 3. Award First Timer achievement if first order
  IF v_profile.total_orders = 0 OR v_profile.total_orders IS NULL THEN
    DECLARE
      v_achievement RECORD;
    BEGIN
      SELECT * INTO v_achievement 
      FROM achievements 
      WHERE requirement_type = 'purchase_count' AND requirement_value = 1 
      LIMIT 1;
      
      IF v_achievement IS NOT NULL THEN
        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at, created_at, updated_at)
        VALUES (p_user_id, v_achievement.id, 1, NOW(), NOW(), NOW())
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        
        IF v_achievement.xp_reward > 0 THEN
          UPDATE user_profiles SET total_xp = total_xp + v_achievement.xp_reward WHERE id = p_user_id;
          INSERT INTO xp_transactions (user_id, amount, action, description)
          VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: First Timer');
          
          v_result := v_result || jsonb_build_object('first_timer_xp', v_achievement.xp_reward);
        END IF;
      END IF;
    END;
  END IF;

  -- 4. Complete referral if applicable
  SELECT * INTO v_pending_referral
  FROM referrals
  WHERE referred_id = p_user_id
    AND status IN ('pending', 'pending_purchase')
    AND reward_claimed = false
  LIMIT 1;

  IF v_pending_referral IS NOT NULL THEN
    -- Get referrer profile
    SELECT * INTO v_referrer_profile FROM user_profiles WHERE id = v_pending_referral.referrer_id;
    
    IF v_referrer_profile IS NOT NULL THEN
      -- Calculate tier-based XP
      v_referrer_xp := CASE
        WHEN COALESCE(v_referrer_profile.referral_count, 0) >= 25 THEN 750  -- Diamond
        WHEN COALESCE(v_referrer_profile.referral_count, 0) >= 10 THEN 500  -- Gold
        WHEN COALESCE(v_referrer_profile.referral_count, 0) >= 5 THEN 400   -- Silver
        ELSE 300  -- Bronze
      END;

      -- Update referrer profile
      UPDATE user_profiles
      SET 
        total_xp = COALESCE(total_xp, 0) + v_referrer_xp,
        referral_count = COALESCE(referral_count, 0) + 1,
        total_referrals = COALESCE(total_referrals, 0) + 1,
        updated_at = NOW()
      WHERE id = v_pending_referral.referrer_id;

      -- Log XP for referrer
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (v_pending_referral.referrer_id, v_referrer_xp, 'referral', 'Referral completed! Friend made purchase.');

      -- Update referral status
      UPDATE referrals
      SET status = 'completed', reward_claimed = true, updated_at = NOW()
      WHERE id = v_pending_referral.id;

      v_result := v_result || jsonb_build_object('referral_completed', true, 'referrer_xp', v_referrer_xp);
    END IF;
  END IF;

  -- 5. Mark reward as used if applicable
  IF v_order.applied_reward_id IS NOT NULL THEN
    UPDATE user_coupons
    SET is_used = true, used_at = NOW(), used_on_order_id = p_order_id
    WHERE id = v_order.applied_reward_id;
    
    v_result := v_result || jsonb_build_object('reward_marked_used', true);
  END IF;

  -- 6. Grant bonus spin for big spenders (R1000+)
  IF v_order_total >= 1000 THEN
    UPDATE user_profiles SET free_spins = COALESCE(free_spins, 0) + 1 WHERE id = p_user_id;
    v_result := v_result || jsonb_build_object('bonus_spin_granted', true);
  END IF;

  -- 7. Mark rewards as processed on order
  UPDATE orders SET rewards_processed = true, updated_at = NOW() WHERE id = p_order_id;

  -- 8. Run check_achievements
  PERFORM check_achievements(p_user_id);

  RETURN jsonb_build_object('success', true) || v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'process_purchase_rewards error: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ensure orders table has rewards_processed column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'rewards_processed'
  ) THEN
    ALTER TABLE orders ADD COLUMN rewards_processed BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added rewards_processed column to orders';
  END IF;
END $$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION process_purchase_rewards(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_purchase_rewards(UUID, UUID) TO service_role;

-- 7. Ensure user_achievements has unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_achievements_user_achievement_unique'
  ) THEN
    ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_achievement_unique 
    UNIQUE (user_id, achievement_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unique constraint may already exist: %', SQLERRM;
END $$;

-- 8. Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ All purchase issues fixed!';
  RAISE NOTICE 'New function available: process_purchase_rewards(user_id, order_id)';
END $$;

