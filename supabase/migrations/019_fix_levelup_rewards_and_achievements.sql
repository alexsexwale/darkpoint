-- ===========================================
-- Fix Level-Up Rewards & Clean Up Duplicate Achievements
-- ===========================================

-- ============================================
-- PART 1: Level-Up Reward Granting
-- ============================================

-- Function to grant level-up rewards (discount coupons)
CREATE OR REPLACE FUNCTION grant_levelup_reward(
  p_user_id UUID,
  p_old_level INTEGER,
  p_new_level INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_tier RECORD;
  v_new_tier RECORD;
  v_discount_value INTEGER;
  v_coupon_code TEXT;
BEGIN
  -- Get old tier info
  SELECT * INTO v_old_tier
  FROM levels
  WHERE level = p_old_level;
  
  -- Get new tier info
  SELECT * INTO v_new_tier
  FROM levels
  WHERE level = p_new_level;
  
  -- If moved to a new tier with different discount
  IF v_new_tier.discount_percent > COALESCE(v_old_tier.discount_percent, 0) THEN
    v_discount_value := v_new_tier.discount_percent;
    v_coupon_code := 'LVLUP-' || p_new_level || '-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 6));
    
    -- Create coupon for the user
    INSERT INTO user_coupons (
      user_id, 
      code, 
      discount_type, 
      discount_value,
      min_order_value,
      source, 
      expires_at
    )
    VALUES (
      p_user_id,
      v_coupon_code,
      'percent'::discount_type,
      v_discount_value,
      0, -- No minimum
      'achievement', -- Level up is an achievement
      NOW() + INTERVAL '30 days'
    );
    
    RETURN json_build_object(
      'success', true,
      'reward_granted', true,
      'discount_percent', v_discount_value,
      'coupon_code', v_coupon_code,
      'new_tier', v_new_tier.title
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'reward_granted', false,
    'reason', 'No tier change'
  );
END;
$$;

-- Update add_xp function to grant level-up rewards
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action xp_action,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := false;
  v_levelup_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  v_old_level := v_profile.current_level;
  v_new_xp := v_profile.total_xp + p_amount;
  
  -- Calculate new level
  SELECT level INTO v_new_level
  FROM levels
  WHERE xp_required <= v_new_xp
  ORDER BY level DESC
  LIMIT 1;
  
  IF v_new_level IS NULL THEN
    v_new_level := 1;
  END IF;
  
  v_leveled_up := v_new_level > v_old_level;
  
  -- Update user profile
  UPDATE user_profiles SET
    total_xp = v_new_xp,
    current_level = v_new_level,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, p_amount, p_action, COALESCE(p_description, 'XP earned from ' || p_action));
  
  -- Grant level-up reward if leveled up
  IF v_leveled_up THEN
    SELECT grant_levelup_reward(p_user_id, v_old_level, v_new_level) INTO v_levelup_result;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'xp_earned', p_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'levelup_reward', v_levelup_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: Remove Duplicate Achievements
-- ============================================

-- First, delete duplicates from user_achievements that reference duplicates
DELETE FROM user_achievements 
WHERE achievement_id IN (
  SELECT a1.id 
  FROM achievements a1
  JOIN achievements a2 ON a1.name = a2.name AND a1.id > a2.id
);

-- Now delete the duplicate achievements (keep oldest/original)
DELETE FROM achievements 
WHERE id IN (
  SELECT a1.id 
  FROM achievements a1
  JOIN achievements a2 ON a1.name = a2.name AND a1.id > a2.id
);

-- Also clean up by matching requirement_type and requirement_value
DELETE FROM user_achievements 
WHERE achievement_id IN (
  SELECT a1.id 
  FROM achievements a1
  JOIN achievements a2 ON 
    a1.requirement_type = a2.requirement_type AND 
    a1.requirement_value = a2.requirement_value AND 
    a1.id > a2.id
);

DELETE FROM achievements 
WHERE id IN (
  SELECT a1.id 
  FROM achievements a1
  JOIN achievements a2 ON 
    a1.requirement_type = a2.requirement_type AND 
    a1.requirement_value = a2.requirement_value AND 
    a1.id > a2.id
);

-- ============================================
-- PART 3: Add New Business-Boosting Achievements
-- ============================================

-- These achievements subtly encourage spending and engagement
INSERT INTO achievements (id, name, description, category, icon, xp_reward, rarity, requirement_type, requirement_value, is_hidden, is_active)
VALUES
  -- Shopping achievements that encourage larger orders
  ('big_spender_500', 'Big Spender', 'Place an order of R500 or more', 'shopping', '💳', 100, 'rare', 'single_order_value', 500, false, true),
  ('big_spender_1000', 'High Roller', 'Place an order of R1000 or more', 'shopping', '💰', 200, 'epic', 'single_order_value', 1000, false, true),
  ('big_spender_2500', 'Whale', 'Place an order of R2500 or more', 'shopping', '🐋', 500, 'legendary', 'single_order_value', 2500, true, true),
  
  -- Cart size achievements (encourage buying more items)
  ('cart_5_items', 'Cart Champion', 'Have 5+ items in a single order', 'shopping', '🛒', 75, 'common', 'items_in_order', 5, false, true),
  ('cart_10_items', 'Shopping Spree', 'Have 10+ items in a single order', 'shopping', '🎊', 150, 'rare', 'items_in_order', 10, false, true),
  
  -- Repeat customer achievements
  ('repeat_3_orders', 'Return Customer', 'Complete 3 orders', 'shopping', '🔄', 100, 'common', 'total_orders', 3, false, true),
  ('repeat_10_orders', 'Loyal Customer', 'Complete 10 orders', 'shopping', '💎', 300, 'rare', 'total_orders', 10, false, true),
  ('repeat_25_orders', 'VIP Shopper', 'Complete 25 orders', 'shopping', '👑', 750, 'epic', 'total_orders', 25, true, true),
  
  -- Spending milestones (lifetime)
  ('lifetime_2500', 'Invested Gamer', 'Spend R2500 lifetime', 'shopping', '📊', 200, 'rare', 'total_spent', 2500, false, true),
  ('lifetime_5000', 'Gaming Enthusiast', 'Spend R5000 lifetime', 'shopping', '🎯', 400, 'epic', 'total_spent', 5000, false, true),
  ('lifetime_10000', 'Gaming Legend', 'Spend R10000 lifetime', 'shopping', '🏆', 1000, 'legendary', 'total_spent', 10000, true, true),
  
  -- Category diversity (encourages exploring different products)
  ('category_3', 'Diverse Gamer', 'Buy from 3 different categories', 'collector', '🌈', 50, 'common', 'categories_purchased', 3, false, true),
  ('category_5', 'Genre Master', 'Buy from 5 different categories', 'collector', '🎭', 100, 'rare', 'categories_purchased', 5, false, true),
  
  -- Quick checkout (reduces cart abandonment)
  ('quick_checkout', 'Speed Shopper', 'Complete checkout within 5 minutes', 'special', '⚡', 50, 'common', 'checkout_time', 300, true, true),
  
  -- Newsletter & profile completion (marketing value)
  ('newsletter_sub', 'Stay Connected', 'Subscribe to newsletter', 'engagement', '📧', 25, 'common', 'newsletter', 1, false, true),
  ('profile_complete', 'Identity Established', 'Complete your profile with all details', 'engagement', '📝', 50, 'common', 'profile_complete', 1, false, true),
  
  -- Referral achievements (customer acquisition)
  ('referral_3', 'Social Gamer', 'Refer 3 friends who sign up', 'social', '🤝', 150, 'rare', 'referrals', 3, false, true),
  ('referral_5', 'Influencer', 'Refer 5 friends who sign up', 'social', '📣', 300, 'epic', 'referrals', 5, false, true),
  ('referral_10', 'Brand Ambassador', 'Refer 10 friends who sign up', 'social', '🌟', 750, 'legendary', 'referrals', 10, true, true),
  
  -- Review quality (social proof)
  ('detailed_review', 'Critic', 'Write a detailed review (100+ characters)', 'engagement', '📝', 30, 'common', 'detailed_review', 1, false, true),
  ('helpful_reviewer', 'Helpful Hand', 'Get 5 helpful votes on your reviews', 'social', '👍', 100, 'rare', 'helpful_votes', 5, true, true),
  
  -- Wishlist to purchase conversion (intent to buy)
  ('wishlist_bought', 'Wish Granted', 'Purchase an item from your wishlist', 'shopping', '🌠', 50, 'common', 'wishlist_purchased', 1, false, true),
  ('wishlist_cleared', 'Dreams Come True', 'Purchase 5 items from your wishlist', 'shopping', '✨', 150, 'rare', 'wishlist_purchased', 5, false, true),
  
  -- Streak achievements (engagement)
  ('streak_14', 'Dedicated', '14-day login streak', 'engagement', '🔥', 200, 'rare', 'streak', 14, false, true),
  ('streak_30', 'Unstoppable', '30-day login streak', 'engagement', '💪', 500, 'epic', 'streak', 30, false, true),
  ('streak_60', 'Legend', '60-day login streak', 'engagement', '🏅', 1000, 'legendary', 'streak', 60, true, true),
  
  -- Sale participation (drives sale traffic)
  ('sale_hunter', 'Bargain Hunter', 'Make a purchase during a sale', 'shopping', '🏷️', 50, 'common', 'sale_purchase', 1, false, true),
  ('sale_master', 'Deal Master', 'Make 5 purchases during sales', 'shopping', '🎪', 150, 'rare', 'sale_purchase', 5, true, true),
  
  -- First week engagement (onboarding)
  ('early_adopter', 'Early Adopter', 'Make a purchase within first week of signing up', 'special', '🚀', 100, 'rare', 'first_week_purchase', 1, true, true),
  
  -- Gaming-specific fun achievements
  ('midnight_gamer', 'Night Owl', 'Browse the store after midnight', 'special', '🦉', 25, 'common', 'midnight_visit', 1, true, true),
  ('weekend_warrior', 'Weekend Warrior', 'Make a purchase on the weekend', 'special', '🎮', 25, 'common', 'weekend_purchase', 1, true, true)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 4: Update check_achievements to handle new types
-- ============================================

CREATE OR REPLACE FUNCTION check_achievements_v3(
  p_user_id UUID,
  p_skip_xp_types TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_unlocked TEXT[] := '{}';
  v_unlocked_with_xp TEXT[] := '{}';
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
  SELECT COUNT(DISTINCT p.category) INTO v_categories_purchased
  FROM orders o
  JOIN LATERAL jsonb_array_elements(o.items::jsonb) AS item ON true
  JOIN products p ON p.id = (item->>'product_id')::UUID
  WHERE o.user_id = p_user_id AND o.status IN ('processing', 'shipped', 'delivered');
  
  -- Check each achievement
  FOR v_achievement IN
    SELECT a.* FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = true
      AND ua.id IS NULL -- Not yet unlocked
  LOOP
    v_should_unlock := false;
    v_progress := 0;
    
    -- Calculate progress based on requirement type
    CASE v_achievement.requirement_type
      WHEN 'total_spent' THEN
        v_progress := v_profile.total_spent;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'total_orders' THEN
        v_progress := v_profile.total_orders;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'reviews' THEN
        v_progress := v_profile.total_reviews;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'referrals' THEN
        v_progress := v_profile.referral_count;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'streak' THEN
        v_progress := GREATEST(v_profile.current_streak, v_profile.longest_streak);
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'wishlist' THEN
        v_progress := v_wishlist_count;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'categories_purchased' THEN
        v_progress := v_categories_purchased;
        v_should_unlock := v_progress >= v_achievement.requirement_value;
        
      WHEN 'newsletter' THEN
        SELECT 1 INTO v_progress FROM newsletter_subscribers WHERE email = (
          SELECT email FROM auth.users WHERE id = p_user_id
        );
        v_should_unlock := v_progress IS NOT NULL;
        
      ELSE
        -- Skip unknown types for now
        CONTINUE;
    END CASE;
    
    -- Unlock if criteria met
    IF v_should_unlock THEN
      INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
      VALUES (p_user_id, v_achievement.id, v_progress, NOW())
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      v_unlocked := array_append(v_unlocked, v_achievement.id);
      
      -- Grant XP if not in skip list
      IF NOT (v_achievement.requirement_type = ANY(p_skip_xp_types)) THEN
        UPDATE user_profiles
        SET total_xp = total_xp + v_achievement.xp_reward,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Log XP transaction
        INSERT INTO xp_transactions (user_id, amount, action, description)
        VALUES (p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
        
        v_unlocked_with_xp := array_append(v_unlocked_with_xp, v_achievement.id);
      END IF;
    ELSE
      -- Update progress for partial achievements
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_progress)
      ON CONFLICT (user_id, achievement_id) 
      DO UPDATE SET progress = EXCLUDED.progress, updated_at = NOW();
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'unlocked', v_unlocked,
    'unlocked_with_xp', v_unlocked_with_xp,
    'count', array_length(v_unlocked, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION grant_levelup_reward(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements_v3(UUID, TEXT[]) TO authenticated;

