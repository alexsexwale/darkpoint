-- RESTORE AND CHECK ALL ACHIEVEMENTS
-- This migration creates a comprehensive function to check and award ALL achievements

-- First, drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS check_achievements_v2(UUID);
DROP FUNCTION IF EXISTS check_achievements_v3(UUID);
DROP FUNCTION IF EXISTS check_achievements_v4(UUID);
DROP FUNCTION IF EXISTS get_user_achievements(UUID, TEXT);
DROP FUNCTION IF EXISTS restore_user_achievements(UUID);

-- Create the main achievement checking function
CREATE OR REPLACE FUNCTION check_achievements_v4(p_user_id UUID)
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
BEGIN
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
    COALESCE((SELECT COUNT(*) FROM wishlists WHERE user_id = p_user_id), 0) as wishlist_count,
    COALESCE((SELECT COUNT(DISTINCT achievement_id) FROM user_achievements WHERE user_id = p_user_id), 0) as achievements_count
  INTO v_user
  FROM user_profiles up
  WHERE up.id = p_user_id;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
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
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_unlocked;

    -- Calculate progress based on requirement type
    v_progress := 0;
    
    CASE v_achievement.requirement_type
      -- Purchase achievements
      WHEN 'purchases' THEN
        v_progress := v_user.orders_count;
      
      -- Spending achievements
      WHEN 'total_spent' THEN
        v_progress := FLOOR(v_user.spent_amount);
      
      -- Single order value
      WHEN 'single_order_value' THEN
        v_progress := FLOOR(v_user.max_order_value);
      
      -- Items in single order
      WHEN 'items_in_order' THEN
        v_progress := v_user.max_order_items;
      
      -- Wishlist achievements
      WHEN 'wishlist' THEN
        v_progress := v_user.wishlist_count;
      
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
      
      -- Newsletter subscription
      WHEN 'newsletter' THEN
        v_progress := CASE WHEN v_user.newsletter_subscribed THEN 1 ELSE 0 END;
      
      -- Profile completion
      WHEN 'profile_complete' THEN
        v_progress := CASE 
          WHEN v_user.display_name IS NOT NULL 
            AND v_user.username IS NOT NULL 
          THEN 1 ELSE 0 END;
      
      -- Spin achievements
      WHEN 'spin' THEN
        v_progress := v_user.spins_count;
      
      -- Products viewed
      WHEN 'products_viewed' THEN
        v_progress := v_user.products_viewed_count;
      
      -- Categories purchased
      WHEN 'categories_purchased' THEN
        v_progress := v_user.categories_count;
      
      -- Shares
      WHEN 'shares' THEN
        v_progress := v_user.shares_count;
      
      -- Unique products owned
      WHEN 'unique_products' THEN
        SELECT COUNT(DISTINCT oi.product_id) INTO v_progress
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = p_user_id AND o.payment_status = 'paid';
      
      -- Achievements unlocked (meta achievement)
      WHEN 'achievements_unlocked' THEN
        v_progress := v_user.achievements_count;
      
      -- Time-based achievements - these are checked when orders are placed
      WHEN 'weekend_purchase' THEN
        SELECT COUNT(*) INTO v_progress
        FROM orders 
        WHERE user_id = p_user_id 
          AND payment_status = 'paid'
          AND EXTRACT(DOW FROM created_at) IN (0, 6);
        v_progress := LEAST(v_progress, 1);
      
      WHEN 'night_purchase' THEN
        SELECT COUNT(*) INTO v_progress
        FROM orders 
        WHERE user_id = p_user_id 
          AND payment_status = 'paid'
          AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'Africa/Johannesburg') >= 22;
        v_progress := LEAST(v_progress, 1);
      
      WHEN 'early_purchase' THEN
        SELECT COUNT(*) INTO v_progress
        FROM orders 
        WHERE user_id = p_user_id 
          AND payment_status = 'paid'
          AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'Africa/Johannesburg') < 8;
        v_progress := LEAST(v_progress, 1);
      
      ELSE
        v_progress := 0;
    END CASE;

    -- Update or insert progress
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
      END;

    -- Check if newly unlocked
    IF v_progress >= v_achievement.requirement_value AND NOT v_already_unlocked THEN
      v_unlocked := array_append(v_unlocked, v_achievement.id);
      v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id);
      v_total_xp_awarded := v_total_xp_awarded + v_achievement.xp_reward;
      
      -- Award XP
      UPDATE user_profiles 
      SET total_xp = total_xp + v_achievement.xp_reward,
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
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id AND unlocked_at IS NOT NULL
    ) INTO v_already_unlocked;
    
    UPDATE user_achievements
    SET progress = LEAST(v_progress, v_achievement.requirement_value),
        unlocked_at = CASE 
          WHEN unlocked_at IS NOT NULL THEN unlocked_at
          WHEN v_progress >= v_achievement.requirement_value THEN NOW()
          ELSE NULL 
        END
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    IF v_progress >= v_achievement.requirement_value AND NOT v_already_unlocked THEN
      IF NOT (v_achievement.id = ANY(v_unlocked)) THEN
        v_unlocked := array_append(v_unlocked, v_achievement.id);
        v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id);
        v_total_xp_awarded := v_total_xp_awarded + v_achievement.xp_reward;
        
        UPDATE user_profiles 
        SET total_xp = total_xp + v_achievement.xp_reward,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        INSERT INTO xp_transactions (user_id, amount, action, description)
        VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement unlocked: ' || v_achievement.name);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'unlocked_with_xp', v_unlocked_with_xp,
    'xp_awarded', v_total_xp_awarded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create alias for backwards compatibility
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements_v4(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create v2 and v3 aliases for any code that might call them
CREATE OR REPLACE FUNCTION check_achievements_v2(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements_v4(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_achievements_v3(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements_v4(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user achievements with progress
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
      'icon', a.icon,
      'xp_reward', a.xp_reward,
      'rarity', a.rarity,
      'requirement_type', a.requirement_type,
      'requirement_value', a.requirement_value,
      'is_hidden', a.is_hidden,
      'is_unlocked', ua.unlocked_at IS NOT NULL,
      'unlocked_at', ua.unlocked_at,
      'progress', COALESCE(ua.progress, 0)
    )
    ORDER BY 
      CASE a.rarity 
        WHEN 'common' THEN 1 
        WHEN 'rare' THEN 2 
        WHEN 'epic' THEN 3 
        WHEN 'legendary' THEN 4 
      END,
      a.requirement_value
  )
  INTO v_achievements
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

-- Make sure user_achievements table has proper constraints
DO $$
BEGIN
  -- Add unique constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_achievement_unique'
  ) THEN
    ALTER TABLE user_achievements 
    ADD CONSTRAINT user_achievements_user_achievement_unique 
    UNIQUE (user_id, achievement_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ensure columns exist in user_profiles for tracking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_shares INT DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS categories_viewed INT DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_items INT DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS products_viewed INT DEFAULT 0;

-- Create a function to restore achievements for a specific user
-- This should be called after running the migration
CREATE OR REPLACE FUNCTION restore_user_achievements(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- First, ensure user_achievements records exist for all achievements
  INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
  SELECT p_user_id, a.id, 0, NULL
  FROM achievements a
  WHERE a.is_active = true
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  -- Then run the full achievement check to update progress and unlock
  RETURN check_achievements_v4(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user_achievements(UUID) TO authenticated;

-- Trigger to check achievements after order status changes
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    PERFORM check_achievements_v4(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create order trigger if orders table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    DROP TRIGGER IF EXISTS check_achievements_after_order ON orders;
    CREATE TRIGGER check_achievements_after_order
      AFTER UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION trigger_check_achievements_on_order();
  END IF;
END $$;

-- Trigger function for reviews (create function even if table doesn't exist)
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_achievements_v4(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create review trigger if reviews table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    DROP TRIGGER IF EXISTS check_achievements_after_review ON reviews;
    CREATE TRIGGER check_achievements_after_review
      AFTER INSERT ON reviews
      FOR EACH ROW
      EXECUTE FUNCTION trigger_check_achievements_on_review();
  END IF;
END $$;

-- Trigger function for wishlist
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_wishlist()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_achievements_v4(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create wishlist trigger if wishlists table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    DROP TRIGGER IF EXISTS check_achievements_after_wishlist ON wishlists;
    CREATE TRIGGER check_achievements_after_wishlist
      AFTER INSERT ON wishlists
      FOR EACH ROW
      EXECUTE FUNCTION trigger_check_achievements_on_wishlist();
  END IF;
END $$;

