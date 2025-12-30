-- ============================================
-- Migration: Achievement XP Deduplication
-- Prevents double XP when quest and achievement complete from same action
-- ============================================

-- ============================================
-- FUNCTION: Check and Unlock Achievements (with XP deduplication)
-- p_skip_xp_types: array of requirement_types that should not receive XP
-- (because they already received XP from a quest)
-- ============================================
CREATE OR REPLACE FUNCTION check_achievements_v2(
  p_user_id UUID,
  p_skip_xp_types TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_achievement achievements%ROWTYPE;
  v_unlocked TEXT[] := '{}';
  v_unlocked_with_xp TEXT[] := '{}';
  v_unlocked_without_xp TEXT[] := '{}';
  v_current_value INTEGER;
  v_skip_xp BOOLEAN;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
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
      WHEN 'wishlist' THEN (SELECT COUNT(*) FROM user_wishlist WHERE user_id = p_user_id)::INTEGER
      WHEN 'categories' THEN (
        SELECT COUNT(DISTINCT category) FROM (
          SELECT UNNEST(categories) as category 
          FROM user_activity_log 
          WHERE user_id = p_user_id 
          AND activity_type = 'view_category'
        ) AS cat
      )::INTEGER
      WHEN 'share' THEN (
        SELECT COUNT(*) FROM user_activity_log 
        WHERE user_id = p_user_id 
        AND activity_type = 'share_product'
      )::INTEGER
      ELSE 0
    END;
    
    -- Check if requirement is met
    IF v_current_value >= v_achievement.requirement_value THEN
      -- Unlock achievement
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_current_value)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- Check if we should skip XP for this requirement type
      v_skip_xp := v_achievement.requirement_type = ANY(p_skip_xp_types);
      
      IF NOT v_skip_xp THEN
        -- Add XP reward (only if not skipping)
        PERFORM add_xp(p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
        v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id);
      ELSE
        v_unlocked_without_xp := array_append(v_unlocked_without_xp, v_achievement.id);
      END IF;
      
      v_unlocked := array_append(v_unlocked, v_achievement.id);
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'unlocked_with_xp', v_unlocked_with_xp,
    'unlocked_without_xp', v_unlocked_without_xp,
    'count', array_length(v_unlocked, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update Achievement Progress
-- Updates progress for specific achievement types without full check
-- ============================================
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id UUID,
  p_requirement_type TEXT,
  p_progress INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_achievement achievements%ROWTYPE;
  v_existing user_achievements%ROWTYPE;
  v_unlocked TEXT[] := '{}';
BEGIN
  -- Find all achievements of this requirement type
  FOR v_achievement IN 
    SELECT * FROM achievements 
    WHERE is_active = true 
    AND requirement_type = p_requirement_type
    ORDER BY requirement_value ASC
  LOOP
    -- Check if already unlocked
    SELECT * INTO v_existing 
    FROM user_achievements 
    WHERE user_id = p_user_id AND achievement_id = v_achievement.id;
    
    IF FOUND THEN
      -- Already unlocked, skip
      CONTINUE;
    END IF;
    
    -- Check if requirement is now met
    IF p_progress >= v_achievement.requirement_value THEN
      -- Unlock achievement
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, p_progress)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- Add XP reward
      PERFORM add_xp(p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
      
      v_unlocked := array_append(v_unlocked, v_achievement.id);
    ELSE
      -- Update progress (upsert)
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, p_progress)
      ON CONFLICT (user_id, achievement_id) 
      DO UPDATE SET progress = GREATEST(user_achievements.progress, EXCLUDED.progress);
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'count', array_length(v_unlocked, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION check_achievements_v2(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_achievement_progress(UUID, TEXT, INTEGER) TO authenticated;

