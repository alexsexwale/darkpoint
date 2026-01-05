-- ================================================
-- COMPREHENSIVE ACHIEVEMENT FIX
-- This script fixes all achievement-related issues
-- Run this in Supabase SQL Editor
-- ================================================

-- Step 0: Ensure all required columns exist in user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_spins INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS products_viewed INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS categories_viewed INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_value NUMERIC DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_items INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- Step 1: Ensure achievements table exists with correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements') THEN
    RAISE EXCEPTION 'achievements table does not exist! Please run the initial migrations first.';
  END IF;
END $$;

-- Step 2: Ensure user_achievements table exists with correct structure
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Step 3: Drop all existing achievement functions to recreate them cleanly
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS check_achievements_v2(UUID, TEXT[]);
DROP FUNCTION IF EXISTS check_achievements_v3(UUID);
DROP FUNCTION IF EXISTS check_achievements_v4(UUID);
DROP FUNCTION IF EXISTS get_user_achievements(UUID, TEXT);
DROP FUNCTION IF EXISTS restore_user_achievements(UUID);

-- Step 4: Create the main achievement checking function
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_achievement RECORD;
  v_progress INT;
  v_unlocked TEXT[] := ARRAY[]::TEXT[];
  v_unlocked_with_xp TEXT[] := ARRAY[]::TEXT[];
  v_total_xp_awarded INT := 0;
  v_already_unlocked BOOLEAN;
  v_current_hour INT;
  v_current_dow INT;
  v_wishlist_count INT;
  v_orders_count INT;
BEGIN
  -- First, get wishlist count directly
  SELECT COUNT(*) INTO v_wishlist_count 
  FROM user_wishlist 
  WHERE user_id = p_user_id;
  
  -- Get orders count (paid orders only)
  SELECT COUNT(*) INTO v_orders_count
  FROM orders 
  WHERE user_id = p_user_id 
  AND (payment_status = 'paid' OR payment_status::text = 'paid');

  -- Get user profile with all stats
  SELECT 
    up.*,
    COALESCE(up.total_orders, 0) as orders_count,
    COALESCE(up.total_spent, 0) as spent_amount,
    COALESCE(up.total_reviews, 0) as reviews_count,
    COALESCE(up.total_referrals, 0) as referrals_count,
    COALESCE(up.total_shares, 0) as shares_count,
    COALESCE(up.current_streak, 0) as streak_count,
    COALESCE(up.current_level, 1) as level_count,
    COALESCE(up.total_spins, 0) as spins_count,
    COALESCE(up.products_viewed, 0) as products_viewed_count,
    COALESCE(up.categories_viewed, 0) as categories_count,
    COALESCE(up.single_order_max_value, 0) as max_order_value,
    COALESCE(up.single_order_max_items, 0) as max_order_items,
    v_wishlist_count as wishlist_count,
    COALESCE((SELECT COUNT(DISTINCT achievement_id) FROM user_achievements WHERE user_id = p_user_id AND unlocked_at IS NOT NULL), 0) as achievements_count
  INTO v_user
  FROM user_profiles up
  WHERE up.id = p_user_id;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Update orders_count from actual orders if user_profiles value is 0
  IF v_user.orders_count = 0 AND v_orders_count > 0 THEN
    v_user.orders_count := v_orders_count;
    -- Also update user_profiles
    UPDATE user_profiles SET total_orders = v_orders_count WHERE id = p_user_id;
  END IF;

  -- Get current time info for time-based achievements
  v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Africa/Johannesburg');
  v_current_dow := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Africa/Johannesburg');

  -- Loop through all active achievements
  FOR v_achievement IN 
    SELECT * FROM achievements WHERE is_active = true
  LOOP
    -- Check if already unlocked
    SELECT EXISTS(
      SELECT 1 FROM user_achievements 
      WHERE user_id = p_user_id 
      AND achievement_id = v_achievement.id 
      AND unlocked_at IS NOT NULL
    ) INTO v_already_unlocked;

    -- Skip if already unlocked
    IF v_already_unlocked THEN
      CONTINUE;
    END IF;

    -- Calculate progress based on requirement type
    v_progress := 0;
    
    CASE v_achievement.requirement_type
      -- Purchase achievements
      WHEN 'purchases' THEN
        v_progress := GREATEST(v_user.orders_count, v_orders_count);
      
      -- Orders count (alias for purchases)
      WHEN 'orders' THEN
        v_progress := GREATEST(v_user.orders_count, v_orders_count);
      
      -- Spending achievements
      WHEN 'total_spent' THEN
        v_progress := FLOOR(v_user.spent_amount);
      
      -- Single order value
      WHEN 'single_order_value' THEN
        v_progress := FLOOR(v_user.max_order_value);
      
      -- Items in single order
      WHEN 'items_in_order' THEN
        v_progress := v_user.max_order_items;
      
      -- Wishlist achievements - use direct count
      WHEN 'wishlist' THEN
        v_progress := v_wishlist_count;
      
      -- Review achievements
      WHEN 'reviews' THEN
        v_progress := v_user.reviews_count;
      
      -- Referral achievements
      WHEN 'referrals' THEN
        v_progress := v_user.referrals_count;
      
      -- Streak achievements
      WHEN 'streak' THEN
        v_progress := v_user.streak_count;
      
      -- Level achievements
      WHEN 'level' THEN
        v_progress := v_user.level_count;
      
      -- Share achievements
      WHEN 'shares' THEN
        v_progress := v_user.shares_count;
      
      -- Spin achievements
      WHEN 'spins' THEN
        v_progress := v_user.spins_count;
      
      -- Products viewed
      WHEN 'products_viewed' THEN
        v_progress := v_user.products_viewed_count;
      
      -- Categories
      WHEN 'categories' THEN
        v_progress := v_user.categories_count;
      
      -- Meta: Achievement collector
      WHEN 'achievements_unlocked' THEN
        v_progress := v_user.achievements_count;
      
      -- Newsletter subscription
      WHEN 'newsletter' THEN
        IF v_user.newsletter_subscribed = true THEN
          v_progress := 1;
        END IF;
      
      -- Profile complete
      WHEN 'profile_complete' THEN
        IF v_user.display_name IS NOT NULL AND v_user.avatar_url IS NOT NULL THEN
          v_progress := 1;
        END IF;
      
      -- Time-based achievements (always 1 if condition met)
      WHEN 'night_owl' THEN
        IF v_current_hour >= 0 AND v_current_hour < 5 THEN
          v_progress := 1;
        END IF;
      
      WHEN 'early_bird' THEN
        IF v_current_hour >= 5 AND v_current_hour < 8 THEN
          v_progress := 1;
        END IF;
      
      WHEN 'weekend_warrior' THEN
        IF v_current_dow IN (0, 6) THEN
          v_progress := 1;
        END IF;
      
      ELSE
        -- For unknown types, try to use the value directly if numeric
        v_progress := 0;
    END CASE;

    -- Update progress in user_achievements (upsert)
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (
      p_user_id, 
      v_achievement.id, 
      LEAST(v_progress, v_achievement.requirement_value),
      CASE WHEN v_progress >= v_achievement.requirement_value THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = LEAST(EXCLUDED.progress, v_achievement.requirement_value),
      unlocked_at = CASE 
        WHEN user_achievements.unlocked_at IS NOT NULL THEN user_achievements.unlocked_at
        WHEN EXCLUDED.progress >= v_achievement.requirement_value THEN NOW()
        ELSE NULL 
      END,
      updated_at = NOW();

    -- Check if newly unlocked
    IF v_progress >= v_achievement.requirement_value THEN
      v_unlocked := array_append(v_unlocked, v_achievement.id);
      v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id);
      v_total_xp_awarded := v_total_xp_awarded + v_achievement.xp_reward;
      
      -- Award XP
      UPDATE user_profiles 
      SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward,
          updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Log XP transaction
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement unlocked: ' || v_achievement.name);
    END IF;
  END LOOP;

  -- Re-check meta achievements (achievements_unlocked) after all other achievements
  FOR v_achievement IN 
    SELECT * FROM achievements 
    WHERE is_active = true AND requirement_type = 'achievements_unlocked'
  LOOP
    SELECT COUNT(DISTINCT achievement_id) INTO v_progress
    FROM user_achievements 
    WHERE user_id = p_user_id AND unlocked_at IS NOT NULL;

    SELECT EXISTS(
      SELECT 1 FROM user_achievements 
      WHERE user_id = p_user_id 
      AND achievement_id = v_achievement.id 
      AND unlocked_at IS NOT NULL
    ) INTO v_already_unlocked;

    IF NOT v_already_unlocked AND v_progress >= v_achievement.requirement_value THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
      VALUES (p_user_id, v_achievement.id, v_progress, NOW())
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET
        progress = v_progress,
        unlocked_at = NOW(),
        updated_at = NOW();
      
      v_unlocked := array_append(v_unlocked, v_achievement.id);
      v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id);
      v_total_xp_awarded := v_total_xp_awarded + v_achievement.xp_reward;
      
      UPDATE user_profiles 
      SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward,
          updated_at = NOW()
      WHERE id = p_user_id;
      
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement unlocked: ' || v_achievement.name);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'unlocked_with_xp', v_unlocked_with_xp,
    'xp_awarded', v_total_xp_awarded,
    'count', COALESCE(array_length(v_unlocked, 1), 0),
    'debug', jsonb_build_object(
      'wishlist_count', v_wishlist_count,
      'orders_count', v_orders_count,
      'profile_orders_count', v_user.orders_count
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create alias functions
CREATE OR REPLACE FUNCTION check_achievements_v2(p_user_id UUID, p_skip_xp_types TEXT[] DEFAULT ARRAY[]::TEXT[])
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_achievements_v3(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_achievements_v4(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create get_user_achievements function
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID, p_category TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_achievements JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'description', a.description,
      'category', a.category,
      'rarity', a.rarity,
      'icon', a.icon,
      'xp_reward', a.xp_reward,
      'requirement_type', a.requirement_type,
      'requirement_value', a.requirement_value,
      'is_hidden', a.is_hidden,
      'is_active', a.is_active,
      'is_unlocked', ua.unlocked_at IS NOT NULL,
      'unlocked_at', ua.unlocked_at,
      'progress', COALESCE(ua.progress, 0)
    ) ORDER BY 
      CASE WHEN ua.unlocked_at IS NOT NULL THEN 0 ELSE 1 END,
      a.category,
      a.requirement_value
  ) INTO v_achievements
  FROM achievements a
  LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = p_user_id
  WHERE a.is_active = true
  AND (p_category IS NULL OR a.category = p_category);

  RETURN jsonb_build_object(
    'success', true,
    'achievements', COALESCE(v_achievements, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create restore_user_achievements function
CREATE OR REPLACE FUNCTION restore_user_achievements(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Simply call check_achievements to recalculate all progress
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant all necessary permissions
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO service_role;

GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_user_achievements(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION restore_user_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user_achievements(UUID) TO anon;
GRANT EXECUTE ON FUNCTION restore_user_achievements(UUID) TO service_role;

-- Step 9: Enable RLS and set policies for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;
CREATE POLICY "Users can update own achievements" ON user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to user_achievements" ON user_achievements;
CREATE POLICY "Service role full access to user_achievements" ON user_achievements
  FOR ALL USING (true);

-- Step 10: Test the function (replace with your actual user ID)
-- SELECT check_achievements('YOUR-USER-UUID-HERE');

-- Show completion message
SELECT 'Achievement system fixed! Please test by calling: SELECT check_achievements(auth.uid());' as status;

