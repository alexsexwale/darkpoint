-- ============================================
-- Migration: Add wishlist XP action and improve achievement tracking
-- ============================================

-- Add 'add_wishlist' to xp_action enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'add_wishlist' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'xp_action')
  ) THEN
    ALTER TYPE xp_action ADD VALUE 'add_wishlist';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Enum value might already exist
  NULL;
END $$;

-- ============================================
-- Create or update achievements for wishlist
-- ============================================

-- Ensure Window Shopper achievement exists
INSERT INTO achievements (
  id, name, description, category, icon, 
  xp_reward, rarity, requirement_type, requirement_value,
  is_hidden, is_active
) VALUES 
  ('window-shopper', 'Window Shopper', 'Add your first item to wishlist', 'engagement', '💚', 15, 'common', 'wishlist', 1, false, true),
  ('collector', 'Collector', 'Add 10 items to wishlist', 'engagement', '📦', 50, 'common', 'wishlist', 10, false, true),
  ('curator', 'Curator', 'Add 25 items to wishlist', 'engagement', '🎯', 100, 'rare', 'wishlist', 25, false, true)
ON CONFLICT (id) DO UPDATE SET
  requirement_type = EXCLUDED.requirement_type,
  is_active = EXCLUDED.is_active;

-- ============================================
-- Fix check_achievements to properly handle wishlist
-- ============================================
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_achievement achievements%ROWTYPE;
  v_unlocked TEXT[] := '{}';
  v_current_value INTEGER;
  v_wishlist_count INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Pre-calculate wishlist count for efficiency
  SELECT COUNT(*) INTO v_wishlist_count FROM user_wishlist WHERE user_id = p_user_id;
  
  -- Check each achievement that hasn't been unlocked yet
  FOR v_achievement IN 
    SELECT * FROM achievements WHERE is_active = true
    AND id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = p_user_id)
  LOOP
    -- Get current value based on requirement type
    v_current_value := CASE v_achievement.requirement_type
      WHEN 'purchases' THEN v_profile.total_orders
      WHEN 'total_spent' THEN v_profile.total_spent::INTEGER
      WHEN 'orders' THEN v_profile.total_orders
      WHEN 'reviews' THEN v_profile.total_reviews
      WHEN 'referrals' THEN v_profile.referral_count
      WHEN 'streak' THEN v_profile.current_streak
      WHEN 'wishlist' THEN v_wishlist_count
      WHEN 'categories' THEN (
        SELECT COUNT(DISTINCT reference_id) FROM user_activity_log 
        WHERE user_id = p_user_id AND activity_type = 'view_category'
      )::INTEGER
      WHEN 'share' THEN (
        SELECT COUNT(*) FROM user_activity_log 
        WHERE user_id = p_user_id AND activity_type = 'share_product'
      )::INTEGER
      ELSE 0
    END;
    
    -- Check if requirement is met
    IF v_current_value >= v_achievement.requirement_value THEN
      -- Unlock achievement
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_current_value)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- Add XP reward
      BEGIN
        PERFORM add_xp(p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
      EXCEPTION WHEN OTHERS THEN
        -- If add_xp fails, still mark achievement as unlocked
        NULL;
      END;
      
      v_unlocked := array_append(v_unlocked, v_achievement.id);
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'count', array_length(v_unlocked, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;

