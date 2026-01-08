-- ============================================================
-- FIX: Purchase Rewards - XP, Achievements, and Referral Completion
-- Run this in Supabase SQL editor
-- ============================================================

-- Step 1: Fix add_xp function to ensure it works
DROP FUNCTION IF EXISTS add_xp(UUID, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_action TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_xp INTEGER;
  v_multiplier NUMERIC := 1.0;
  v_final_amount INTEGER;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Check for active XP multiplier
  BEGIN
    SELECT COALESCE(multiplier, 1.0) INTO v_multiplier
    FROM xp_multipliers
    WHERE NOW() BETWEEN start_time AND end_time
      AND is_active = true
    ORDER BY multiplier DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_multiplier := 1.0;
  END;

  -- Calculate final amount with multiplier
  v_final_amount := CEIL(p_amount * v_multiplier);

  -- Update user XP
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_final_amount,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_xp INTO v_new_xp;

  -- If user profile doesn't exist, create it
  IF v_new_xp IS NULL THEN
    INSERT INTO user_profiles (id, total_xp, created_at, updated_at)
    VALUES (p_user_id, v_final_amount, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      total_xp = COALESCE(user_profiles.total_xp, 0) + v_final_amount,
      updated_at = NOW()
    RETURNING total_xp INTO v_new_xp;
  END IF;

  -- Log the transaction
  INSERT INTO xp_transactions (user_id, amount, action, description, created_at)
  VALUES (p_user_id, v_final_amount, p_action, COALESCE(p_description, p_action), NOW());

  RAISE NOTICE 'add_xp: User % awarded % XP (base: %, multiplier: %) for action %',
    p_user_id, v_final_amount, p_amount, v_multiplier, p_action;

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_final_amount,
    'base_amount', p_amount,
    'multiplier', v_multiplier,
    'new_total', v_new_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Fix complete_referral_on_purchase to handle both 'pending' and 'pending_purchase' status
DROP FUNCTION IF EXISTS complete_referral_on_purchase(UUID);

CREATE OR REPLACE FUNCTION complete_referral_on_purchase(
  p_buyer_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_referral_count INTEGER;
  v_referrer_xp INTEGER;
  v_referral_id UUID;
  v_referred_name TEXT;
  v_current_status TEXT;
BEGIN
  RAISE NOTICE 'complete_referral_on_purchase called for user: %', p_buyer_user_id;

  -- Check if this buyer was referred and referral is still pending
  -- Check for BOTH 'pending' and 'pending_purchase' status values
  SELECT 
    r.id,
    r.referrer_id,
    COALESCE(up.referral_count, 0),
    COALESCE(rp.display_name, rp.username, 'A friend'),
    r.status::TEXT
  INTO v_referral_id, v_referrer_id, v_referrer_referral_count, v_referred_name, v_current_status
  FROM referrals r
  JOIN user_profiles up ON up.id = r.referrer_id
  LEFT JOIN user_profiles rp ON rp.id = r.referred_id
  WHERE r.referred_id = p_buyer_user_id
    AND r.status::TEXT IN ('pending', 'pending_purchase')
    AND (r.reward_claimed = false OR r.reward_claimed IS NULL);

  RAISE NOTICE 'Found referral: id=%, referrer=%, status=%', v_referral_id, v_referrer_id, v_current_status;

  -- No pending referral for this user
  IF v_referrer_id IS NULL THEN
    RAISE NOTICE 'No pending referral found for user %', p_buyer_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'No pending referral for this user'
    );
  END IF;

  -- Calculate XP based on referrer's CURRENT tier
  v_referrer_xp := CASE
    WHEN v_referrer_referral_count >= 25 THEN 750  -- Diamond tier
    WHEN v_referrer_referral_count >= 10 THEN 500  -- Gold tier
    WHEN v_referrer_referral_count >= 5 THEN 400   -- Silver tier
    ELSE 300  -- Bronze tier (0-4 referrals)
  END;

  RAISE NOTICE 'Awarding % XP to referrer % (tier based on % referrals)', v_referrer_xp, v_referrer_id, v_referrer_referral_count;

  -- Award XP to the REFERRER
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_referrer_xp,
    referral_count = COALESCE(referral_count, 0) + 1,
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- Log XP transaction for referrer with tier info
  INSERT INTO xp_transactions (user_id, amount, action, description, created_at)
  VALUES (v_referrer_id, v_referrer_xp, 'referral', 
    v_referred_name || ' made their first purchase! (' || 
    CASE
      WHEN v_referrer_referral_count >= 25 THEN 'Diamond'
      WHEN v_referrer_referral_count >= 10 THEN 'Gold'
      WHEN v_referrer_referral_count >= 5 THEN 'Silver'
      ELSE 'Bronze'
    END || ' tier bonus)', NOW());

  -- Update referral status to completed
  UPDATE referrals SET
    status = 'completed',
    reward_claimed = true,
    updated_at = NOW()
  WHERE id = v_referral_id;

  RAISE NOTICE 'Referral % status updated to completed', v_referral_id;

  -- Check achievements for the referrer
  BEGIN
    PERFORM check_achievements(v_referrer_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Achievement check for referrer failed: %', SQLERRM;
  END;

  RAISE NOTICE 'Referral completed! Referrer % earned % XP', v_referrer_id, v_referrer_xp;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_xp_awarded', v_referrer_xp,
    'tier', CASE
      WHEN v_referrer_referral_count >= 25 THEN 'Diamond'
      WHEN v_referrer_referral_count >= 10 THEN 'Gold'
      WHEN v_referrer_referral_count >= 5 THEN 'Silver'
      ELSE 'Bronze'
    END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in complete_referral_on_purchase: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Fix check_achievements to properly award purchase achievements
DROP FUNCTION IF EXISTS check_achievements(UUID);

CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_user_stats RECORD;
  v_unlocked_achievements TEXT[] := ARRAY[]::TEXT[];
  v_progress INTEGER;
  v_should_unlock BOOLEAN;
BEGIN
  RAISE NOTICE 'check_achievements called for user: %', p_user_id;

  -- Get user stats
  SELECT 
    COALESCE(total_orders, 0) as total_orders,
    COALESCE(total_spent, 0) as total_spent,
    COALESCE(wishlist_count, 0) as wishlist_count,
    COALESCE(review_count, 0) as review_count,
    COALESCE(referral_count, 0) as referral_count,
    COALESCE(total_referrals, 0) as total_referrals,
    COALESCE(login_streak, 0) as login_streak,
    COALESCE(total_logins, 0) as total_logins,
    COALESCE(total_xp, 0) as total_xp
  INTO v_user_stats
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_user_stats IS NULL THEN
    RAISE NOTICE 'User profile not found for %', p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RAISE NOTICE 'User stats: orders=%, spent=%, referrals=%', 
    v_user_stats.total_orders, v_user_stats.total_spent, v_user_stats.referral_count;

  -- Loop through all achievements
  FOR v_achievement IN 
    SELECT * FROM achievements WHERE is_active = true
  LOOP
    -- Calculate progress based on achievement type
    v_progress := 0;
    v_should_unlock := false;

    CASE v_achievement.requirement_type
      WHEN 'purchase_count' THEN
        v_progress := v_user_stats.total_orders;
      WHEN 'purchase_amount' THEN
        v_progress := v_user_stats.total_spent::INTEGER;
      WHEN 'wishlist_count' THEN
        v_progress := v_user_stats.wishlist_count;
      WHEN 'review_count' THEN
        v_progress := v_user_stats.review_count;
      WHEN 'referral_count' THEN
        v_progress := v_user_stats.referral_count;
      WHEN 'login_streak' THEN
        v_progress := v_user_stats.login_streak;
      WHEN 'total_logins' THEN
        v_progress := v_user_stats.total_logins;
      WHEN 'total_xp' THEN
        v_progress := v_user_stats.total_xp;
      WHEN 'social_share' THEN
        -- Check social shares table if exists
        SELECT COUNT(*) INTO v_progress FROM social_shares WHERE user_id = p_user_id;
      ELSE
        v_progress := 0;
    END CASE;

    -- Check if should unlock
    v_should_unlock := v_progress >= v_achievement.requirement_value AND v_achievement.requirement_value > 0;

    -- Update or insert user_achievement record
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at, created_at, updated_at)
    VALUES (
      p_user_id, 
      v_achievement.id, 
      v_progress,
      CASE WHEN v_should_unlock THEN NOW() ELSE NULL END,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = EXCLUDED.progress,
      unlocked_at = CASE 
        WHEN user_achievements.unlocked_at IS NULL AND EXCLUDED.unlocked_at IS NOT NULL THEN EXCLUDED.unlocked_at
        ELSE user_achievements.unlocked_at
      END,
      updated_at = NOW();

    -- If newly unlocked, award XP and track
    IF v_should_unlock THEN
      -- Check if this is a new unlock (not already unlocked)
      IF NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id 
          AND achievement_id = v_achievement.id 
          AND unlocked_at IS NOT NULL
          AND unlocked_at < NOW() - INTERVAL '1 second'
      ) THEN
        -- Award achievement XP
        IF v_achievement.xp_reward > 0 THEN
          UPDATE user_profiles SET
            total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward,
            updated_at = NOW()
          WHERE id = p_user_id;

          INSERT INTO xp_transactions (user_id, amount, action, description, created_at)
          VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name, NOW());
        END IF;

        v_unlocked_achievements := array_append(v_unlocked_achievements, v_achievement.name);
        RAISE NOTICE 'Achievement unlocked: % (XP: %)', v_achievement.name, v_achievement.xp_reward;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'check_achievements completed. Unlocked: %', v_unlocked_achievements;

  RETURN jsonb_build_object(
    'success', true,
    'unlocked', v_unlocked_achievements,
    'user_stats', row_to_json(v_user_stats)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in check_achievements: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Fix update_user_order_stats to properly update purchase stats
DROP FUNCTION IF EXISTS update_user_order_stats(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION update_user_order_stats(
  p_user_id UUID,
  p_order_total NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_new_total_orders INTEGER;
  v_new_total_spent NUMERIC;
BEGIN
  RAISE NOTICE 'update_user_order_stats: user=%, total=%', p_user_id, p_order_total;

  UPDATE user_profiles SET
    total_orders = COALESCE(total_orders, 0) + 1,
    total_spent = COALESCE(total_spent, 0) + p_order_total,
    last_purchase_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_orders, total_spent INTO v_new_total_orders, v_new_total_spent;

  -- If user doesn't exist, create profile
  IF v_new_total_orders IS NULL THEN
    INSERT INTO user_profiles (id, total_orders, total_spent, last_purchase_at, created_at, updated_at)
    VALUES (p_user_id, 1, p_order_total, NOW(), NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      total_orders = COALESCE(user_profiles.total_orders, 0) + 1,
      total_spent = COALESCE(user_profiles.total_spent, 0) + p_order_total,
      last_purchase_at = NOW(),
      updated_at = NOW()
    RETURNING total_orders, total_spent INTO v_new_total_orders, v_new_total_spent;
  END IF;

  RAISE NOTICE 'User stats updated: orders=%, spent=%', v_new_total_orders, v_new_total_spent;

  RETURN jsonb_build_object(
    'success', true,
    'total_orders', v_new_total_orders,
    'total_spent', v_new_total_spent
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in update_user_order_stats: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION add_xp(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp(UUID, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_referral_on_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_referral_on_purchase(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_order_stats(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_order_stats(UUID, NUMERIC) TO service_role;

-- Step 6: Ensure social_shares table exists for achievement check
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Diagnostic - Show current referrals status
SELECT 
  r.id,
  r.status,
  r.reward_claimed,
  r.created_at,
  up_referrer.display_name as referrer_name,
  up_referred.display_name as referred_name
FROM referrals r
LEFT JOIN user_profiles up_referrer ON r.referrer_id = up_referrer.id
LEFT JOIN user_profiles up_referred ON r.referred_id = up_referred.id
ORDER BY r.created_at DESC
LIMIT 10;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Purchase rewards fix applied!';
  RAISE NOTICE 'Functions updated:';
  RAISE NOTICE '  - add_xp: Awards XP with multiplier support';
  RAISE NOTICE '  - complete_referral_on_purchase: Handles both pending and pending_purchase status';
  RAISE NOTICE '  - check_achievements: Properly checks and awards achievements';
  RAISE NOTICE '  - update_user_order_stats: Updates purchase statistics';
END $$;

