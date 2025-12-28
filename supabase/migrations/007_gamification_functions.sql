-- Migration 007: Gamification Functions
-- Functions for gamification system integration

-- ============================================
-- FUNCTION: Claim Daily Reward
-- ============================================
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_longest_streak INTEGER;
  v_cycle_day INTEGER;
  v_xp_earned INTEGER;
  v_bonus_reward TEXT;
  v_already_claimed BOOLEAN;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if already claimed today
  SELECT EXISTS(
    SELECT 1 FROM daily_logins 
    WHERE user_id = p_user_id AND login_date = v_today
  ) INTO v_already_claimed;
  
  IF v_already_claimed THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed today', 'claimed', true);
  END IF;
  
  -- Calculate streak
  IF v_profile.last_login_date = v_yesterday THEN
    -- Consecutive day
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_login_date = v_today THEN
    -- Same day (shouldn't happen due to check above)
    v_new_streak := v_profile.current_streak;
  ELSE
    -- Streak broken
    v_new_streak := 1;
  END IF;
  
  -- Update longest streak
  v_longest_streak := GREATEST(v_new_streak, v_profile.longest_streak);
  
  -- Calculate cycle day (1-7)
  v_cycle_day := ((v_new_streak - 1) % 7) + 1;
  
  -- Calculate XP (base 10 + streak bonus, max 100)
  v_xp_earned := LEAST(10 + (v_new_streak * 2), 100);
  
  -- Determine bonus reward based on cycle day
  v_bonus_reward := CASE v_cycle_day
    WHEN 3 THEN 'small_xp_bonus'
    WHEN 5 THEN 'free_spin'
    WHEN 7 THEN 'mystery_reward'
    ELSE NULL
  END;
  
  -- Insert daily login record
  INSERT INTO daily_logins (user_id, login_date, day_of_streak, xp_earned, bonus_reward)
  VALUES (p_user_id, v_today, v_new_streak, v_xp_earned, v_bonus_reward);
  
  -- Update user profile
  UPDATE user_profiles SET
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    last_login_date = v_today,
    total_xp = total_xp + v_xp_earned,
    -- Add spin if day 5
    available_spins = CASE WHEN v_cycle_day = 5 THEN available_spins + 1 ELSE available_spins END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, v_xp_earned, 'daily_login', 'Day ' || v_new_streak || ' login bonus');
  
  -- Build result
  v_result := json_build_object(
    'success', true,
    'streak', v_new_streak,
    'longest_streak', v_longest_streak,
    'cycle_day', v_cycle_day,
    'xp_earned', v_xp_earned,
    'bonus_reward', v_bonus_reward,
    'free_spin_earned', v_cycle_day = 5
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Spin the Wheel
-- ============================================
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_prize spin_prizes%ROWTYPE;
  v_random DECIMAL;
  v_cumulative DECIMAL := 0;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check available spins
  IF v_profile.available_spins <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No spins available');
  END IF;
  
  -- Generate random number for weighted selection
  v_random := random() * 100;
  
  -- Select prize based on weighted probability
  FOR v_prize IN SELECT * FROM spin_prizes WHERE is_active = true ORDER BY probability DESC
  LOOP
    v_cumulative := v_cumulative + v_prize.probability;
    IF v_random <= v_cumulative THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- If no prize selected (shouldn't happen), use first active prize
  IF v_prize.id IS NULL THEN
    SELECT * INTO v_prize FROM spin_prizes WHERE is_active = true LIMIT 1;
  END IF;
  
  -- Decrement available spins
  UPDATE user_profiles SET
    available_spins = available_spins - 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record spin in history
  INSERT INTO spin_history (user_id, prize_id)
  VALUES (p_user_id, v_prize.id);
  
  -- Apply prize immediately based on type
  CASE v_prize.prize_type
    WHEN 'xp' THEN
      UPDATE user_profiles SET total_xp = total_xp + v_prize.prize_value::INTEGER WHERE id = p_user_id;
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_prize.prize_value::INTEGER, 'spin_wheel', 'Spin wheel prize: ' || v_prize.name);
    WHEN 'spin' THEN
      UPDATE user_profiles SET available_spins = available_spins + v_prize.prize_value::INTEGER WHERE id = p_user_id;
    WHEN 'credit' THEN
      UPDATE user_profiles SET store_credit = store_credit + v_prize.prize_value::DECIMAL WHERE id = p_user_id;
    WHEN 'discount', 'shipping' THEN
      -- Create coupon for user
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, source, expires_at)
      VALUES (
        p_user_id,
        'SPIN-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 8)),
        CASE WHEN v_prize.prize_type = 'shipping' THEN 'shipping' ELSE 'percent' END,
        CASE WHEN v_prize.prize_type = 'shipping' THEN 0 ELSE v_prize.prize_value::DECIMAL END,
        'spin',
        NOW() + INTERVAL '30 days'
      );
    ELSE
      NULL; -- Mystery prizes handled separately
  END CASE;
  
  v_result := json_build_object(
    'success', true,
    'prize', json_build_object(
      'id', v_prize.id,
      'name', v_prize.name,
      'description', v_prize.description,
      'prize_type', v_prize.prize_type,
      'prize_value', v_prize.prize_value,
      'color', v_prize.color
    ),
    'remaining_spins', v_profile.available_spins - 1
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Purchase Reward from Shop
-- ============================================
CREATE OR REPLACE FUNCTION purchase_reward(p_user_id UUID, p_reward_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_reward rewards%ROWTYPE;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get reward
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  -- Check stock
  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Out of stock');
  END IF;
  
  -- Check XP balance
  IF v_profile.total_xp < v_reward.xp_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient XP', 'required', v_reward.xp_cost, 'current', v_profile.total_xp);
  END IF;
  
  -- Deduct XP
  UPDATE user_profiles SET
    total_xp = total_xp - v_reward.xp_cost,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Reduce stock if limited
  IF v_reward.stock IS NOT NULL THEN
    UPDATE rewards SET stock = stock - 1 WHERE id = p_reward_id;
  END IF;
  
  -- Log XP transaction (negative)
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, -v_reward.xp_cost, 'purchase', 'Purchased: ' || v_reward.name);
  
  -- Apply reward based on category
  CASE v_reward.category
    WHEN 'discount', 'shipping' THEN
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, source, expires_at)
      VALUES (
        p_user_id,
        'REWARD-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 8)),
        CASE WHEN v_reward.category = 'shipping' THEN 'shipping' ELSE 'percent' END,
        CASE WHEN v_reward.category = 'shipping' THEN 0 ELSE v_reward.value::DECIMAL END,
        'reward',
        NOW() + INTERVAL '90 days'
      );
    WHEN 'spin' THEN
      UPDATE user_profiles SET available_spins = available_spins + v_reward.value::INTEGER WHERE id = p_user_id;
    WHEN 'xp_booster' THEN
      -- Record XP booster (could be stored in user_rewards)
      INSERT INTO user_rewards (user_id, reward_id, expires_at)
      VALUES (p_user_id, p_reward_id, NOW() + INTERVAL '24 hours');
    WHEN 'cosmetic', 'exclusive' THEN
      -- Record cosmetic purchase
      INSERT INTO user_rewards (user_id, reward_id)
      VALUES (p_user_id, p_reward_id);
  END CASE;
  
  v_result := json_build_object(
    'success', true,
    'reward', json_build_object(
      'id', v_reward.id,
      'name', v_reward.name,
      'category', v_reward.category
    ),
    'xp_spent', v_reward.xp_cost,
    'remaining_xp', v_profile.total_xp - v_reward.xp_cost
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Add XP to User
-- ============================================
CREATE OR REPLACE FUNCTION add_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_new_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := false;
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
  
  RETURN json_build_object(
    'success', true,
    'xp_earned', p_amount,
    'total_xp', v_new_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check and Unlock Achievements
-- ============================================
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_achievement achievements%ROWTYPE;
  v_unlocked TEXT[] := '{}';
  v_current_value INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check each achievement
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
      ELSE 0
    END;
    
    -- Check if requirement is met
    IF v_current_value >= v_achievement.requirement_value THEN
      -- Unlock achievement
      INSERT INTO user_achievements (user_id, achievement_id, progress)
      VALUES (p_user_id, v_achievement.id, v_current_value)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- Add XP reward
      PERFORM add_xp(p_user_id, v_achievement.xp_reward, 'achievement', 'Achievement: ' || v_achievement.name);
      
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

-- ============================================
-- FUNCTION: Get User Gamification Stats
-- ============================================
CREATE OR REPLACE FUNCTION get_gamification_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_level_info levels%ROWTYPE;
  v_next_level levels%ROWTYPE;
  v_total_achievements INTEGER;
  v_unlocked_achievements INTEGER;
  v_legendary_count INTEGER;
  v_total_xp_earned INTEGER;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get current level info
  SELECT * INTO v_level_info FROM levels WHERE level = v_profile.current_level;
  
  -- Get next level info
  SELECT * INTO v_next_level FROM levels WHERE level > v_profile.current_level ORDER BY level ASC LIMIT 1;
  
  -- Count achievements
  SELECT COUNT(*) INTO v_total_achievements FROM achievements WHERE is_active = true;
  SELECT COUNT(*) INTO v_unlocked_achievements FROM user_achievements WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_legendary_count FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id AND a.rarity = 'legendary';
  
  -- Total XP earned (from transactions)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_xp_earned 
  FROM xp_transactions 
  WHERE user_id = p_user_id AND amount > 0;
  
  v_result := json_build_object(
    'success', true,
    'profile', json_build_object(
      'total_xp', v_profile.total_xp,
      'current_level', v_profile.current_level,
      'current_streak', v_profile.current_streak,
      'longest_streak', v_profile.longest_streak,
      'available_spins', v_profile.available_spins,
      'store_credit', v_profile.store_credit,
      'referral_code', v_profile.referral_code,
      'referral_count', v_profile.referral_count,
      'last_login_date', v_profile.last_login_date
    ),
    'level_info', json_build_object(
      'level', v_level_info.level,
      'title', v_level_info.title,
      'badge_color', v_level_info.badge_color,
      'discount_percent', v_level_info.discount_percent,
      'perks', v_level_info.perks
    ),
    'next_level', CASE WHEN v_next_level.level IS NOT NULL THEN json_build_object(
      'level', v_next_level.level,
      'xp_required', v_next_level.xp_required,
      'xp_needed', v_next_level.xp_required - v_profile.total_xp
    ) ELSE NULL END,
    'achievements', json_build_object(
      'total', v_total_achievements,
      'unlocked', v_unlocked_achievements,
      'legendary', v_legendary_count,
      'xp_earned', v_total_xp_earned
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get User Achievements with Progress
-- ============================================
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID, p_category TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  SELECT json_build_object(
    'success', true,
    'achievements', (
      SELECT json_agg(
        json_build_object(
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
          'is_unlocked', ua.achievement_id IS NOT NULL,
          'unlocked_at', ua.unlocked_at,
          'progress', COALESCE(ua.progress, CASE a.requirement_type
            WHEN 'purchases' THEN v_profile.total_orders
            WHEN 'total_spent' THEN v_profile.total_spent::INTEGER
            WHEN 'orders' THEN v_profile.total_orders
            WHEN 'reviews' THEN v_profile.total_reviews
            WHEN 'referrals' THEN v_profile.referral_count
            WHEN 'streak' THEN v_profile.current_streak
            ELSE 0
          END)
        )
      )
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = p_user_id
      WHERE a.is_active = true
        AND (p_category IS NULL OR a.category = p_category)
        AND (NOT a.is_hidden OR ua.achievement_id IS NOT NULL)
      ORDER BY a.category, a.requirement_value
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check Daily Reward Status
-- ============================================
CREATE OR REPLACE FUNCTION check_daily_reward_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_claimed_today BOOLEAN;
  v_cycle_day INTEGER;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if claimed today
  SELECT EXISTS(
    SELECT 1 FROM daily_logins WHERE user_id = p_user_id AND login_date = v_today
  ) INTO v_claimed_today;
  
  -- Calculate what day in cycle it would be
  IF v_profile.last_login_date = v_today - INTERVAL '1 day' THEN
    v_cycle_day := ((v_profile.current_streak) % 7) + 1;
  ELSE
    v_cycle_day := 1;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'claimed_today', v_claimed_today,
    'current_streak', v_profile.current_streak,
    'next_cycle_day', v_cycle_day,
    'last_login_date', v_profile.last_login_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION claim_daily_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_reward(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_xp(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gamification_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_reward_status(UUID) TO authenticated;

