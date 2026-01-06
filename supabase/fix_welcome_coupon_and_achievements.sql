-- Fix welcome coupon and achievements
-- Run this in Supabase SQL Editor

-- ========================
-- PART 1: Grant welcome coupon to users who don't have one
-- ========================

-- First, ensure user_coupons has all required columns and fix constraints
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Make code column nullable (welcome coupons don't need codes)
ALTER TABLE user_coupons ALTER COLUMN code DROP NOT NULL;

-- Check and grant welcome coupons to users who don't have one yet
DO $$
DECLARE
  v_user RECORD;
  v_coupon_count INTEGER;
  v_code TEXT;
BEGIN
  FOR v_user IN SELECT id, email FROM auth.users LOOP
    -- Check if user already has a welcome coupon
    SELECT COUNT(*) INTO v_coupon_count
    FROM user_coupons 
    WHERE user_id = v_user.id AND source = 'welcome';
    
    -- Grant if they don't have one
    IF v_coupon_count = 0 THEN
      -- Generate a unique code
      v_code := 'WELCOME-' || UPPER(LEFT(MD5(v_user.id::TEXT || NOW()::TEXT), 8));
      
      INSERT INTO user_coupons (
        user_id, code, discount_type, discount_value, is_used, source, description, expires_at
      ) VALUES (
        v_user.id, v_code, 'percent', 10, FALSE, 'welcome', 
        '🎁 Welcome Gift: 10% Off Your First Order',
        NOW() + INTERVAL '30 days'
      );
      RAISE NOTICE 'Granted welcome coupon to user: %', v_user.email;
    END IF;
  END LOOP;
END $$;

-- ========================
-- PART 2: Fix achievements - Reset and recreate properly
-- ========================

-- First, clear any incorrectly unlocked achievements
-- This deletes achievements that were unlocked without actual progress
DELETE FROM user_achievements 
WHERE unlocked_at IS NOT NULL 
AND progress = 0;

-- Also clear achievements where progress doesn't match requirement
DELETE FROM user_achievements ua
WHERE ua.unlocked_at IS NOT NULL
AND EXISTS (
  SELECT 1 FROM achievements a 
  WHERE a.id = ua.achievement_id 
  AND ua.progress < a.requirement_value
);

-- Drop and recreate the check_achievements function with PROPER logic
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS check_achievements_v2(UUID, TEXT[]);
DROP FUNCTION IF EXISTS check_achievements_v3(UUID);
DROP FUNCTION IF EXISTS check_achievements_v4(UUID);

CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_progress INTEGER;
  v_profile user_profiles%ROWTYPE;
  v_unlocked TEXT[] := '{}';
  v_unlocked_with_xp TEXT[] := '{}';
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Loop through all active achievements
  FOR v_achievement IN 
    SELECT * FROM achievements WHERE is_active = TRUE AND requirement_value > 0
  LOOP
    -- Calculate progress based on requirement type
    v_progress := 0;
    
    CASE v_achievement.requirement_type
      -- Purchase achievements
      WHEN 'first_purchase', 'purchases' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM orders 
        WHERE user_id = p_user_id AND payment_status = 'paid';
        
      WHEN 'total_spent' THEN
        SELECT COALESCE(FLOOR(SUM(total)), 0) INTO v_progress
        FROM orders 
        WHERE user_id = p_user_id AND payment_status = 'paid';
        
      WHEN 'single_order_value' THEN
        SELECT COALESCE(MAX(FLOOR(total)), 0) INTO v_progress
        FROM orders 
        WHERE user_id = p_user_id AND payment_status = 'paid';
        
      WHEN 'single_order_items' THEN
        SELECT COALESCE(MAX(item_count), 0) INTO v_progress
        FROM (
          SELECT order_id, COUNT(*) as item_count
          FROM order_items
          WHERE order_id IN (SELECT id FROM orders WHERE user_id = p_user_id AND payment_status = 'paid')
          GROUP BY order_id
        ) sub;
        
      -- Wishlist achievements
      WHEN 'wishlist', 'wishlist_items' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM user_wishlist 
        WHERE user_id = p_user_id;
        
      -- Review achievements
      WHEN 'reviews' THEN
        SELECT COALESCE(COUNT(*), 0) INTO v_progress
        FROM reviews 
        WHERE user_id = p_user_id AND is_approved = TRUE;
        
      -- Social achievements
      WHEN 'shares', 'social_shares' THEN
        v_progress := COALESCE(v_profile.total_shares, 0);
        
      WHEN 'referrals' THEN
        v_progress := COALESCE(v_profile.referral_count, 0);
        
      -- Engagement achievements  
      WHEN 'streak', 'login_streak' THEN
        v_progress := COALESCE(v_profile.current_streak, 0);
        
      WHEN 'longest_streak' THEN
        v_progress := COALESCE(v_profile.longest_streak, 0);
        
      WHEN 'categories', 'category_purchases' THEN
        SELECT COALESCE(COUNT(DISTINCT p.category_id), 0) INTO v_progress
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = p_user_id AND o.payment_status = 'paid';
        
      -- XP achievements
      WHEN 'xp', 'total_xp' THEN
        v_progress := COALESCE(v_profile.total_xp, 0);
        
      WHEN 'level' THEN
        v_progress := COALESCE(v_profile.current_level, 1);
        
      -- Newsletter
      WHEN 'newsletter' THEN
        v_progress := CASE WHEN v_profile.newsletter_subscribed THEN 1 ELSE 0 END;
        
      ELSE
        -- Unknown type, skip
        CONTINUE;
    END CASE;
    
    -- Only process if progress > 0 and meets requirement
    IF v_progress > 0 AND v_progress >= v_achievement.requirement_value THEN
      -- Check if already unlocked
      IF NOT EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id 
        AND achievement_id = v_achievement.id 
        AND unlocked_at IS NOT NULL
      ) THEN
        -- Insert or update achievement
        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
        VALUES (p_user_id, v_achievement.id, v_progress, NOW())
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET
          progress = v_progress,
          unlocked_at = NOW(),
          updated_at = NOW();
        
        -- Award XP if achievement has XP reward
        IF v_achievement.xp_reward > 0 THEN
          UPDATE user_profiles 
          SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
          WHERE id = p_user_id;
          
          INSERT INTO xp_transactions (user_id, amount, action, description)
          VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 
                  'Achievement: ' || v_achievement.name);
          
          v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id::TEXT);
        END IF;
        
        v_unlocked := array_append(v_unlocked, v_achievement.id::TEXT);
      END IF;
    ELSE
      -- Update progress only (not unlocked yet)
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_progress)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = v_progress,
        updated_at = NOW()
      WHERE user_achievements.unlocked_at IS NULL;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'unlocked_with_xp', v_unlocked_with_xp,
    'count', array_length(v_unlocked, 1)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;

-- ========================
-- PART 3: Verify and report
-- ========================

SELECT 'Fixes applied!' as status
UNION ALL
SELECT '- Welcome coupons granted to users without one'
UNION ALL
SELECT '- Incorrectly unlocked achievements cleared'
UNION ALL
SELECT '- check_achievements function recreated with proper logic';

