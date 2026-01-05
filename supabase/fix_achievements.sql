-- FIX ACHIEVEMENT CHECKING FUNCTION
-- The function was querying 'wishlists' table which doesn't exist
-- It should be 'user_wishlist'

-- Drop existing functions
DROP FUNCTION IF EXISTS check_achievements(UUID);
DROP FUNCTION IF EXISTS check_achievements_v2(UUID, TEXT[]);
DROP FUNCTION IF EXISTS check_achievements_v3(UUID);
DROP FUNCTION IF EXISTS check_achievements_v4(UUID);

-- Create the main achievement checking function with correct table names
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
    -- FIXED: Changed 'wishlists' to 'user_wishlist'
    COALESCE((SELECT COUNT(*) FROM user_wishlist WHERE user_id = p_user_id), 0) as wishlist_count,
    COALESCE((SELECT COUNT(DISTINCT achievement_id) FROM user_achievements WHERE user_id = p_user_id AND unlocked_at IS NOT NULL), 0) as achievements_count
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
      
      -- Orders count (alias for purchases)
      WHEN 'orders' THEN
        v_progress := v_user.orders_count;
      
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
      SET total_xp = total_xp + v_achievement.xp_reward,
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
    'count', array_length(v_unlocked, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create v2 with skip types support
CREATE OR REPLACE FUNCTION check_achievements_v2(p_user_id UUID, p_skip_xp_types TEXT[] DEFAULT ARRAY[]::TEXT[])
RETURNS JSONB AS $$
BEGIN
  -- Just call the main function - XP dedup is handled differently now
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create v3 alias
CREATE OR REPLACE FUNCTION check_achievements_v3(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create v4 alias
CREATE OR REPLACE FUNCTION check_achievements_v4(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v4(UUID) TO anon;

-- Also fix the delete account function if it references wrong table
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Delete user data in order (to respect foreign keys)
  DELETE FROM xp_transactions WHERE user_id = p_user_id;
  DELETE FROM user_achievements WHERE user_id = p_user_id;
  DELETE FROM user_coupons WHERE user_id = p_user_id;
  DELETE FROM daily_logins WHERE user_id = p_user_id;
  DELETE FROM daily_quest_progress WHERE user_id = p_user_id;
  DELETE FROM spin_history WHERE user_id = p_user_id;
  DELETE FROM product_reviews WHERE user_id = p_user_id;
  DELETE FROM user_wishlist WHERE user_id = p_user_id;
  DELETE FROM user_addresses WHERE user_id = p_user_id;
  DELETE FROM newsletter_subscriptions WHERE user_id = p_user_id;
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  
  -- Mark profile as deleted
  UPDATE user_profiles 
  SET 
    display_name = 'Deleted User',
    username = 'deleted_' || SUBSTRING(p_user_id::TEXT, 1, 8),
    avatar_url = NULL,
    bio = NULL,
    phone = NULL,
    is_deleted = true,
    deleted_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Done!
SELECT 'Achievement functions fixed! The function now correctly queries user_wishlist table.' as status;

