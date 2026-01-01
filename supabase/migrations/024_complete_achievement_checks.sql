-- ============================================
-- Complete Achievement Checking System
-- Ensures ALL achievements can be earned
-- ============================================

-- First, make sure all required achievements exist
INSERT INTO achievements (id, name, description, category, icon, xp_reward, rarity, requirement_type, requirement_value, is_hidden, is_active)
VALUES
  -- First purchase
  ('first_blood', 'First Blood', 'Make your first purchase', 'shopping', '🎯', 100, 'common', 'total_orders', 1, false, true),
  
  -- Getting Started spending milestone
  ('getting_started', 'Getting Started', 'Spend R100 total', 'shopping', '🎬', 50, 'common', 'total_spent', 100, false, true),
  
  -- Supporter spending milestone  
  ('supporter', 'Supporter', 'Spend R1,000 total', 'shopping', '💪', 150, 'rare', 'total_spent', 1000, false, true),
  
  -- Investor spending milestone
  ('investor', 'Investor', 'Spend R5,000 total', 'shopping', '📈', 300, 'epic', 'total_spent', 5000, false, true),
  
  -- Whale spending milestone
  ('whale', 'Whale', 'Spend R10,000 total', 'shopping', '🐳', 500, 'legendary', 'total_spent', 10000, false, true),
  
  -- Regular customer
  ('regular', 'Regular', '5 orders completed', 'shopping', '🏅', 100, 'common', 'total_orders', 5, false, true),
  
  -- Share achievements
  ('sharing_is_caring', 'Sharing is Caring', 'Share your first product', 'social', '🔗', 25, 'common', 'shares', 1, false, true),
  ('social_butterfly', 'Social Butterfly', 'Share 5 products', 'social', '🦋', 75, 'common', 'shares', 5, false, true),
  
  -- Referral achievements
  ('recruiter', 'Recruiter', 'Refer your first friend', 'social', '👋', 100, 'common', 'referrals', 1, false, true),
  ('ambassador', 'Ambassador', 'Refer 5 friends', 'social', '🎖️', 300, 'rare', 'referrals', 5, false, true),
  ('legend_maker', 'Legend Maker', 'Refer 10 friends', 'social', '🌟', 500, 'epic', 'referrals', 10, false, true),
  
  -- Review achievements
  ('reviewer', 'Reviewer', 'Write 5 reviews', 'engagement', '✍️', 150, 'common', 'reviews', 5, false, true),
  ('expert_reviewer', 'Expert Reviewer', 'Write 10 reviews', 'engagement', '📚', 300, 'rare', 'reviews', 10, false, true),
  
  -- Streak achievements
  ('getting_warmed_up', 'Getting Warmed Up', '3-day login streak', 'engagement', '🔥', 25, 'common', 'streak', 3, false, true),
  ('streak_master', 'Streak Master', '7-day login streak', 'engagement', '⚡', 100, 'common', 'streak', 7, false, true),
  
  -- Wishlist achievements
  ('window_shopper', 'Window Shopper', 'Add your first item to wishlist', 'collector', '👁️', 15, 'common', 'wishlist', 1, false, true),
  ('collector', 'Collector', 'Add 10 items to wishlist', 'collector', '📦', 50, 'common', 'wishlist', 10, false, true),
  ('curator', 'Curator', 'Add 25 items to wishlist', 'collector', '🎨', 100, 'rare', 'wishlist', 25, false, true),
  
  -- Explorer achievement
  ('explorer', 'Explorer', 'Browse all categories', 'engagement', '🧭', 50, 'common', 'categories_viewed', 8, false, true)
  
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  xp_reward = EXCLUDED.xp_reward,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  is_hidden = EXCLUDED.is_hidden,
  is_active = EXCLUDED.is_active;

-- ============================================
-- Update user_profiles to track shares
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS categories_viewed INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wishlist_purchases INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_items INTEGER DEFAULT 0;

-- ============================================
-- Comprehensive check_achievements function
-- ============================================
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_unlocked TEXT[] := '{}';
  v_achievement RECORD;
  v_progress INTEGER;
  v_should_unlock BOOLEAN;
  v_wishlist_count INTEGER;
  v_categories_purchased INTEGER;
BEGIN
  -- Get user profile with stats
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get wishlist count
  SELECT COUNT(*) INTO v_wishlist_count
  FROM user_wishlist
  WHERE user_id = p_user_id;
  
  -- Get categories purchased (from orders)
  BEGIN
    SELECT COUNT(DISTINCT COALESCE(item->>'category', 'unknown')) INTO v_categories_purchased
    FROM orders o,
    LATERAL jsonb_array_elements(CASE WHEN o.items IS NOT NULL AND o.items::text != 'null' THEN o.items::jsonb ELSE '[]'::jsonb END) AS item
    WHERE o.user_id = p_user_id AND o.status IN ('processing', 'shipped', 'delivered');
  EXCEPTION WHEN OTHERS THEN
    v_categories_purchased := 0;
  END;
  
  -- Check each achievement
  FOR v_achievement IN
    SELECT a.* FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
      AND (ua.id IS NULL OR ua.unlocked_at IS NULL) -- Not yet unlocked
  LOOP
    v_should_unlock := false;
    v_progress := 0;
    
    -- Calculate progress based on requirement type
    CASE v_achievement.requirement_type
      -- Spending achievements
      WHEN 'total_spent' THEN
        v_progress := COALESCE(v_profile.total_spent, 0)::INTEGER;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Order count achievements
      WHEN 'total_orders' THEN
        v_progress := COALESCE(v_profile.total_orders, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Review achievements
      WHEN 'reviews' THEN
        v_progress := COALESCE(v_profile.total_reviews, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Referral achievements
      WHEN 'referrals' THEN
        v_progress := COALESCE(v_profile.referral_count, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Streak achievements
      WHEN 'streak' THEN
        v_progress := GREATEST(COALESCE(v_profile.current_streak, 0), COALESCE(v_profile.longest_streak, 0));
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Wishlist achievements
      WHEN 'wishlist' THEN
        v_progress := v_wishlist_count;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Category diversity achievements
      WHEN 'categories_purchased' THEN
        v_progress := COALESCE(v_categories_purchased, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Share achievements
      WHEN 'shares' THEN
        v_progress := COALESCE(v_profile.total_shares, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Categories viewed achievements  
      WHEN 'categories_viewed' THEN
        v_progress := COALESCE(v_profile.categories_viewed, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Wishlist purchased achievements
      WHEN 'wishlist_purchased' THEN
        v_progress := COALESCE(v_profile.wishlist_purchases, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Single order value achievements
      WHEN 'single_order_value' THEN
        v_progress := COALESCE(v_profile.single_order_max_value, 0)::INTEGER;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Items in single order achievements
      WHEN 'items_in_order' THEN
        v_progress := COALESCE(v_profile.single_order_max_items, 0);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      -- Newsletter subscription
      WHEN 'newsletter' THEN
        SELECT 1 INTO v_progress FROM newsletter_subscribers WHERE email = (
          SELECT email FROM auth.users WHERE id = p_user_id
        );
        v_should_unlock := v_progress IS NOT NULL;
        IF v_should_unlock THEN v_progress := 1; ELSE v_progress := 0; END IF;
        
      -- Profile completion
      WHEN 'profile_complete' THEN
        IF v_profile.display_name IS NOT NULL 
           AND v_profile.display_name != ''
           AND v_profile.avatar_url IS NOT NULL THEN
          v_progress := 1;
          v_should_unlock := true;
        ELSE
          v_progress := 0;
        END IF;
        
      -- Detailed review (handled by review trigger)
      WHEN 'detailed_review' THEN
        SELECT COUNT(*) INTO v_progress
        FROM product_reviews
        WHERE user_id = p_user_id AND LENGTH(content) >= 100;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      ELSE
        -- Skip unknown types
        CONTINUE;
    END CASE;
    
    -- Unlock if criteria met
    IF v_should_unlock THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
      VALUES (p_user_id, v_achievement.id, v_progress, NOW())
      ON CONFLICT (user_id, achievement_id) 
      DO UPDATE SET progress = EXCLUDED.progress, unlocked_at = NOW();
      
      v_unlocked := array_append(v_unlocked, v_achievement.id);
      
      -- Grant XP
      UPDATE user_profiles
      SET total_xp = total_xp + v_achievement.xp_reward,
          updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Log XP transaction
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_achievement.xp_reward, 'achievement', '🏆 Achievement: ' || v_achievement.name);
    ELSE
      -- Update progress
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_progress)
      ON CONFLICT (user_id, achievement_id) 
      DO UPDATE SET progress = GREATEST(user_achievements.progress, EXCLUDED.progress), updated_at = NOW();
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
-- Function to increment share count and check achievements
-- ============================================
CREATE OR REPLACE FUNCTION increment_share_count(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  UPDATE user_profiles
  SET total_shares = COALESCE(total_shares, 0) + 1,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check achievements
  RETURN check_achievements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Update order trigger to track order achievements
-- ============================================
CREATE OR REPLACE FUNCTION update_order_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution DECIMAL;
  v_item_count INTEGER;
BEGIN
  -- Only process when order becomes paid
  IF NEW.status IN ('processing', 'shipped', 'delivered') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('processing', 'shipped', 'delivered')) THEN
    
    -- Calculate contribution
    v_contribution := COALESCE(NEW.subtotal, 0) - COALESCE(NEW.discount_amount, 0);
    
    -- Count items
    BEGIN
      SELECT COUNT(*) INTO v_item_count
      FROM jsonb_array_elements(CASE WHEN NEW.items IS NOT NULL THEN NEW.items::jsonb ELSE '[]'::jsonb END);
    EXCEPTION WHEN OTHERS THEN
      v_item_count := 1;
    END;
    
    -- Update max order value and items if this order is bigger
    UPDATE user_profiles
    SET single_order_max_value = GREATEST(COALESCE(single_order_max_value, 0), v_contribution),
        single_order_max_items = GREATEST(COALESCE(single_order_max_items, 0), v_item_count),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Check achievements
    PERFORM check_achievements(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS order_achievements_trigger ON orders;
CREATE TRIGGER order_achievements_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_achievements();

-- ============================================
-- Update daily login to check streak achievements
-- ============================================
CREATE OR REPLACE FUNCTION claim_daily_reward()
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_reward_day INTEGER;
  v_xp_reward INTEGER;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if already claimed today
  IF v_profile.last_login_date = v_today THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed today', 'streak', v_profile.current_streak);
  END IF;
  
  -- Calculate streak
  IF v_profile.last_login_date = v_today - 1 THEN
    -- Consecutive day
    UPDATE user_profiles SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_login_date = v_today,
      updated_at = NOW()
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;
  ELSE
    -- Streak broken, reset to 1
    UPDATE user_profiles SET
      current_streak = 1,
      last_login_date = v_today,
      updated_at = NOW()
    WHERE id = auth.uid()
    RETURNING * INTO v_profile;
  END IF;
  
  -- Calculate reward day (1-7 cycle)
  v_reward_day := ((v_profile.current_streak - 1) % 7) + 1;
  
  -- XP rewards: 10, 15, 20, 25, 30, 40, 50
  v_xp_reward := CASE v_reward_day
    WHEN 1 THEN 10
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    WHEN 4 THEN 25
    WHEN 5 THEN 30
    WHEN 6 THEN 40
    WHEN 7 THEN 50
    ELSE 10
  END;
  
  -- Grant XP
  UPDATE user_profiles SET
    total_xp = total_xp + v_xp_reward,
    updated_at = NOW()
  WHERE id = auth.uid();
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (auth.uid(), v_xp_reward, 'daily_login', 'Day ' || v_reward_day || ' login reward');
  
  -- Grant bonus spin on day 5
  IF v_reward_day = 5 THEN
    UPDATE user_profiles SET available_spins = available_spins + 1 WHERE id = auth.uid();
  END IF;
  
  -- Check streak achievements
  PERFORM check_achievements(auth.uid());
  
  v_result := json_build_object(
    'success', true,
    'day', v_reward_day,
    'streak', v_profile.current_streak,
    'xp_reward', v_xp_reward,
    'bonus_spin', v_reward_day = 5
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_share_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_reward() TO authenticated;

