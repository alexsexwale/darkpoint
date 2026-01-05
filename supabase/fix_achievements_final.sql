-- ================================================
-- FINAL ACHIEVEMENT FIX
-- This script properly fixes achievements
-- Run this AFTER deleting the test user
-- ================================================

-- Step 1: Ensure all required columns exist in user_profiles
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

-- Step 2: Fix user_achievements table
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE user_achievements ALTER COLUMN unlocked_at DROP NOT NULL;

-- Step 3: Drop all existing achievement functions
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS check_achievements_v2(UUID, TEXT[]);
DROP FUNCTION IF EXISTS check_achievements_v3(UUID);
DROP FUNCTION IF EXISTS check_achievements_v4(UUID);
DROP FUNCTION IF EXISTS get_user_achievements(UUID, TEXT);
DROP FUNCTION IF EXISTS restore_user_achievements(UUID);

-- Step 4: Create the CORRECT achievement checking function
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_progress INT;
  v_unlocked TEXT[] := ARRAY[]::TEXT[];
  v_total_xp_awarded INT := 0;
  v_already_unlocked BOOLEAN;
  v_requirement INT;
  -- User stats
  v_wishlist_count INT := 0;
  v_orders_count INT := 0;
  v_total_spent NUMERIC := 0;
  v_reviews_count INT := 0;
  v_referrals_count INT := 0;
  v_shares_count INT := 0;
  v_streak_count INT := 0;
  v_level_count INT := 1;
  v_spins_count INT := 0;
  v_achievements_count INT := 0;
  v_newsletter_subscribed BOOLEAN := false;
  v_profile_complete BOOLEAN := false;
  v_current_hour INT;
  v_current_dow INT;
BEGIN
  -- Get wishlist count
  SELECT COALESCE(COUNT(*), 0) INTO v_wishlist_count 
  FROM user_wishlist 
  WHERE user_id = p_user_id;
  
  -- Get paid orders count
  SELECT COALESCE(COUNT(*), 0) INTO v_orders_count
  FROM orders 
  WHERE user_id = p_user_id 
  AND payment_status::text = 'paid';

  -- Get user profile stats
  SELECT 
    COALESCE(total_spent, 0),
    COALESCE(total_reviews, 0),
    COALESCE(total_referrals, 0),
    COALESCE(total_shares, 0),
    COALESCE(current_streak, 0),
    COALESCE(current_level, 1),
    COALESCE(total_spins, 0),
    COALESCE(newsletter_subscribed, false),
    (display_name IS NOT NULL AND display_name != '' AND avatar_url IS NOT NULL AND avatar_url != '')
  INTO 
    v_total_spent,
    v_reviews_count,
    v_referrals_count,
    v_shares_count,
    v_streak_count,
    v_level_count,
    v_spins_count,
    v_newsletter_subscribed,
    v_profile_complete
  FROM user_profiles
  WHERE id = p_user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get already unlocked achievements count
  SELECT COALESCE(COUNT(*), 0) INTO v_achievements_count
  FROM user_achievements 
  WHERE user_id = p_user_id AND unlocked_at IS NOT NULL;

  -- Get current time for time-based achievements
  v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Africa/Johannesburg');
  v_current_dow := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Africa/Johannesburg');

  -- Loop through all active achievements
  FOR v_achievement IN 
    SELECT * FROM achievements 
    WHERE is_active = true 
    AND requirement_value > 0  -- Skip invalid achievements
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

    -- Initialize progress to 0
    v_progress := 0;
    v_requirement := v_achievement.requirement_value;
    
    -- Calculate progress based on requirement type
    CASE v_achievement.requirement_type
      WHEN 'purchases', 'orders' THEN
        v_progress := v_orders_count;
      
      WHEN 'total_spent' THEN
        v_progress := FLOOR(v_total_spent)::INT;
      
      WHEN 'wishlist' THEN
        v_progress := v_wishlist_count;
      
      WHEN 'reviews' THEN
        v_progress := v_reviews_count;
      
      WHEN 'referrals' THEN
        v_progress := v_referrals_count;
      
      WHEN 'streak' THEN
        v_progress := v_streak_count;
      
      WHEN 'level' THEN
        v_progress := v_level_count;
      
      WHEN 'shares' THEN
        v_progress := v_shares_count;
      
      WHEN 'spins' THEN
        v_progress := v_spins_count;
      
      WHEN 'achievements_unlocked' THEN
        v_progress := v_achievements_count;
      
      WHEN 'newsletter' THEN
        IF v_newsletter_subscribed THEN
          v_progress := 1;
        ELSE
          v_progress := 0;
        END IF;
      
      WHEN 'profile_complete' THEN
        IF v_profile_complete THEN
          v_progress := 1;
        ELSE
          v_progress := 0;
        END IF;
      
      WHEN 'night_owl' THEN
        IF v_current_hour >= 0 AND v_current_hour < 5 THEN
          v_progress := 1;
        ELSE
          v_progress := 0;
        END IF;
      
      WHEN 'early_bird' THEN
        IF v_current_hour >= 5 AND v_current_hour < 8 THEN
          v_progress := 1;
        ELSE
          v_progress := 0;
        END IF;
      
      WHEN 'weekend_warrior' THEN
        IF v_current_dow IN (0, 6) THEN
          v_progress := 1;
        ELSE
          v_progress := 0;
        END IF;
      
      ELSE
        -- Unknown type - keep progress at 0
        v_progress := 0;
    END CASE;

    -- Upsert progress to user_achievements
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at, created_at, updated_at)
    VALUES (
      p_user_id, 
      v_achievement.id, 
      LEAST(v_progress, v_requirement),
      CASE WHEN v_progress >= v_requirement AND v_requirement > 0 THEN NOW() ELSE NULL END,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET
      progress = LEAST(EXCLUDED.progress, v_requirement),
      unlocked_at = CASE 
        WHEN user_achievements.unlocked_at IS NOT NULL THEN user_achievements.unlocked_at
        WHEN EXCLUDED.progress >= v_requirement AND v_requirement > 0 THEN NOW()
        ELSE NULL 
      END,
      updated_at = NOW();

    -- Check if newly unlocked (must have actual progress meeting requirement)
    IF v_progress >= v_requirement AND v_requirement > 0 THEN
      v_unlocked := array_append(v_unlocked, v_achievement.id);
      v_total_xp_awarded := v_total_xp_awarded + COALESCE(v_achievement.xp_reward, 0);
      
      -- Award XP
      UPDATE user_profiles 
      SET total_xp = COALESCE(total_xp, 0) + COALESCE(v_achievement.xp_reward, 0),
          updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Log XP transaction
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, COALESCE(v_achievement.xp_reward, 0), 'achievement', 'Achievement: ' || v_achievement.name);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'xp_awarded', v_total_xp_awarded,
    'count', COALESCE(array_length(v_unlocked, 1), 0),
    'stats', jsonb_build_object(
      'wishlist', v_wishlist_count,
      'orders', v_orders_count,
      'reviews', v_reviews_count,
      'streak', v_streak_count,
      'spins', v_spins_count,
      'newsletter', v_newsletter_subscribed
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

-- Step 7: Create restore function (just calls check)
CREATE OR REPLACE FUNCTION restore_user_achievements(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION restore_user_achievements(UUID) TO authenticated, anon, service_role;

-- Step 9: Set up RLS for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access" ON user_achievements;
CREATE POLICY "Service role full access" ON user_achievements
  FOR ALL USING (true);

-- Done!
SELECT 'Achievement system fixed! Delete your test user and create a new account to test.' as status;

