-- ============================================
-- Migration: Fix Welcome Reward and Update Expiry Times
-- ============================================
-- 1. Welcome 10% discount should be a selectable reward (not a code to enter)
-- 2. Welcome rewards expire in 30 days
-- 3. All other rewards expire in 60 days
-- ============================================

-- ============================================
-- Add missing columns (ensure they exist before use)
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;

-- ============================================
-- UPDATE: Handle New User Trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_ref_code_used TEXT;
  v_referral_code TEXT;
  v_is_returning BOOLEAN := FALSE;
  v_welcome_xp INTEGER := 100;
  v_welcome_spins INTEGER := 1;
BEGIN
  -- Check if this email was previously deleted (returning user)
  SELECT EXISTS (
    SELECT 1 FROM deleted_accounts WHERE LOWER(email) = LOWER(NEW.email)
  ) INTO v_is_returning;
  
  -- Extract username from metadata or email
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Extract full name
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CONCAT_WS(' ', 
      NEW.raw_user_meta_data->>'first_name', 
      NEW.raw_user_meta_data->>'last_name'
    )
  );
  IF v_full_name = '' THEN v_full_name := NULL; END IF;
  
  -- Extract referral code if used during signup
  v_ref_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  -- Generate unique referral code for this user
  v_referral_code := 'DARK-' || UPPER(LEFT(REGEXP_REPLACE(v_username, '[^a-zA-Z0-9]', '', 'g'), 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = v_referral_code) LOOP
    v_referral_code := 'DARK-' || UPPER(LEFT(REGEXP_REPLACE(v_username, '[^a-zA-Z0-9]', '', 'g'), 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;
  
  -- Set welcome bonuses based on returning status
  IF v_is_returning THEN
    v_welcome_xp := 0;
    v_welcome_spins := 0;
  END IF;
  
  -- Create user profile
  INSERT INTO user_profiles (
    id,
    username,
    display_name,
    email,
    referral_code,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    total_spent,
    total_orders,
    total_reviews,
    total_shares,
    referral_count,
    available_spins,
    newsletter_subscribed,
    is_returning_user
  ) VALUES (
    NEW.id,
    v_username,
    v_full_name,
    NEW.email,
    v_referral_code,
    v_welcome_xp,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    v_welcome_spins,
    true,
    v_is_returning
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(user_profiles.username, EXCLUDED.username);
  
  -- Log welcome XP and create welcome reward if new user
  IF NOT v_is_returning AND v_welcome_xp > 0 THEN
    -- Log XP transaction
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (NEW.id, v_welcome_xp, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!')
    ON CONFLICT DO NOTHING;
    
    -- Create welcome discount reward (NO CODE - selectable in cart/checkout)
    -- This appears in "My Rewards" section automatically
    INSERT INTO user_coupons (
      user_id,
      code,
      discount_type,
      discount_value,
      min_order_value,
      max_uses,
      uses_count,
      source,
      description,
      expires_at
    ) VALUES (
      NEW.id,
      NULL, -- No code needed - this is a selectable reward
      'percent',
      10,
      0,
      1,
      0,
      'welcome',
      '🎁 Welcome Gift: 10% Off Your First Order',
      NOW() + INTERVAL '30 days'
    );
  END IF;
  
  -- Auto-subscribe to newsletter
  INSERT INTO newsletter_subscriptions (email, user_id, source)
  VALUES (NEW.email, NEW.id, 'registration')
  ON CONFLICT (email) DO UPDATE SET
    user_id = NEW.id,
    is_subscribed = true,
    source = 'registration',
    updated_at = NOW();
  
  -- Handle referral if provided
  IF v_ref_code_used IS NOT NULL AND v_ref_code_used != '' THEN
    PERFORM process_referral_signup(NEW.id, v_ref_code_used);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Add description column to user_coupons if not exists
-- ============================================
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- UPDATE: Purchase Reward function with 60 day expiry
-- ============================================
CREATE OR REPLACE FUNCTION purchase_reward(
  p_user_id UUID,
  p_reward_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_reward RECORD;
  v_user_xp INTEGER;
  v_coupon_code TEXT;
  v_coupon_id UUID;
  v_new_xp INTEGER;
  v_result JSON;
BEGIN
  -- Get user's current XP
  SELECT total_xp INTO v_user_xp FROM user_profiles WHERE id = p_user_id;
  
  IF v_user_xp IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get reward details from rewards table
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id;
  
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  -- Check if user has enough XP
  IF v_user_xp < v_reward.xp_cost THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Not enough XP',
      'required', v_reward.xp_cost,
      'current', v_user_xp
    );
  END IF;
  
  -- Deduct XP
  v_new_xp := v_user_xp - v_reward.xp_cost;
  UPDATE user_profiles SET total_xp = v_new_xp, updated_at = NOW() WHERE id = p_user_id;
  
  -- Log XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, -v_reward.xp_cost, 'redeem', 'Purchased: ' || v_reward.name);
  
  -- Create reward based on type
  CASE v_reward.category
    WHEN 'discount' THEN
      -- Create discount coupon - expires in 60 days
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        NULL, -- No code needed - selectable reward
        'percent'::discount_type,
        v_reward.discount_value,
        0,
        'reward'::coupon_source,
        '🛒 ' || v_reward.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      
    WHEN 'shipping' THEN
      -- Create free shipping coupon - expires in 60 days
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        NULL, -- No code needed - selectable reward
        'shipping'::discount_type,
        0,
        0,
        'reward'::coupon_source,
        '🚚 ' || v_reward.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      
    WHEN 'xp_booster' THEN
      -- Grant XP multiplier immediately
      PERFORM grant_xp_multiplier(
        p_user_id,
        v_reward.multiplier_value,
        24, -- 24 hours duration
        'reward_shop',
        v_reward.name
      );
      
      -- Also record in user_rewards for tracking
      INSERT INTO user_rewards (user_id, reward_id, expires_at)
      VALUES (p_user_id, p_reward_id, NOW() + INTERVAL '24 hours')
      ON CONFLICT (user_id, reward_id) DO UPDATE SET
        expires_at = NOW() + INTERVAL '24 hours',
        purchased_at = NOW();
      
    ELSE
      RETURN json_build_object('success', false, 'error', 'Unknown reward category: ' || v_reward.category);
  END CASE;
  
  RETURN json_build_object(
    'success', true,
    'reward_id', p_reward_id,
    'reward_name', v_reward.name,
    'xp_spent', v_reward.xp_cost,
    'new_xp_total', v_new_xp,
    'coupon_id', v_coupon_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE: Spin Wheel function with 60 day expiry for rewards
-- ============================================
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user user_profiles%ROWTYPE;
  v_prize RECORD;
  v_new_spins INTEGER;
  v_new_xp INTEGER;
  v_coupon_id UUID;
  v_multiplier_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_user FROM user_profiles WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_user.available_spins <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No spins available');
  END IF;
  
  -- Select random prize based on probability
  SELECT * INTO v_prize
  FROM spin_prizes
  WHERE is_active = true
  ORDER BY RANDOM() * (1.0 / probability)
  LIMIT 1;
  
  IF v_prize IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No prizes available');
  END IF;
  
  -- Deduct spin
  v_new_spins := v_user.available_spins - 1;
  
  -- Process prize
  CASE v_prize.prize_type
    WHEN 'xp' THEN
      v_new_xp := v_user.total_xp + v_prize.prize_value;
      UPDATE user_profiles 
      SET total_xp = v_new_xp, available_spins = v_new_spins, updated_at = NOW()
      WHERE id = p_user_id;
      
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (p_user_id, v_prize.prize_value, 'spin', 'Spin Wheel: ' || v_prize.name);
      
    WHEN 'spin' THEN
      -- Award extra spins
      v_new_spins := v_new_spins + v_prize.prize_value;
      UPDATE user_profiles 
      SET available_spins = v_new_spins, updated_at = NOW()
      WHERE id = p_user_id;
      
    WHEN 'discount' THEN
      -- Create discount coupon - expires in 60 days
      INSERT INTO user_coupons (user_id, code, discount_type, discount_value, min_order_value, source, description, expires_at)
      VALUES (
        p_user_id,
        NULL, -- No code needed
        'percent'::discount_type,
        v_prize.prize_value,
        0,
        'spin_wheel'::coupon_source,
        '🎰 Spin Win: ' || v_prize.name,
        NOW() + INTERVAL '60 days'
      )
      RETURNING id INTO v_coupon_id;
      
      UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
      
    WHEN 'xp_multiplier' THEN
      -- Grant XP multiplier
      SELECT grant_xp_multiplier(
        p_user_id,
        COALESCE(v_prize.multiplier_value, 1.5),
        24,
        'spin_wheel',
        v_prize.name
      ) INTO v_multiplier_result;
      
      UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
      
    ELSE
      -- Default: just deduct spin
      UPDATE user_profiles SET available_spins = v_new_spins, updated_at = NOW() WHERE id = p_user_id;
  END CASE;
  
  -- Log spin
  INSERT INTO spin_history (user_id, prize_id, prize_name, prize_type, prize_value)
  VALUES (p_user_id, v_prize.id, v_prize.name, v_prize.prize_type, v_prize.prize_value);
  
  RETURN json_build_object(
    'success', true,
    'prize', json_build_object(
      'id', v_prize.id,
      'name', v_prize.name,
      'type', v_prize.prize_type,
      'value', v_prize.prize_value,
      'color', v_prize.color,
      'icon', v_prize.icon
    ),
    'spins_remaining', v_new_spins,
    'coupon_id', v_coupon_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE: Daily Reward function with 60 day expiry
-- ============================================
CREATE OR REPLACE FUNCTION claim_daily_reward_v2(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_longest_streak INTEGER;
  v_cycle_day INTEGER;
  v_xp_earned INTEGER := 0;
  v_free_spin_earned BOOLEAN := FALSE;
  v_multiplier_applied BOOLEAN := FALSE;
  v_already_claimed BOOLEAN := FALSE;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if already claimed today
  IF v_profile.last_login_date = v_today THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Already claimed today',
      'streak', v_profile.current_streak,
      'next_claim', v_today + INTERVAL '1 day'
    );
  END IF;
  
  -- Calculate new streak
  IF v_profile.last_login_date = v_yesterday THEN
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_login_date IS NULL THEN
    v_new_streak := 1;
  ELSE
    v_new_streak := 1; -- Reset streak
  END IF;
  
  v_longest_streak := GREATEST(v_profile.longest_streak, v_new_streak);
  
  -- Calculate cycle day (1-7)
  v_cycle_day := ((v_new_streak - 1) % 7) + 1;
  
  -- Daily XP rewards (escalating)
  CASE v_cycle_day
    WHEN 1 THEN v_xp_earned := 5;   -- Day 1 start
    WHEN 2 THEN v_xp_earned := 15;
    WHEN 3 THEN v_xp_earned := 25;
    WHEN 4 THEN v_xp_earned := 35;
    WHEN 5 THEN v_xp_earned := 50;
    WHEN 6 THEN v_xp_earned := 75;
    WHEN 7 THEN 
      v_xp_earned := 100;
      v_free_spin_earned := TRUE; -- Bonus spin on day 7!
    ELSE v_xp_earned := 10;
  END CASE;
  
  -- Update profile
  UPDATE user_profiles SET
    last_login_date = v_today,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    total_xp = total_xp + v_xp_earned,
    available_spins = CASE WHEN v_free_spin_earned THEN available_spins + 1 ELSE available_spins END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log XP if earned
  IF v_xp_earned > 0 THEN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, v_xp_earned, 'daily_login', 'Day ' || v_cycle_day || ' streak reward');
  END IF;
  
  -- Log daily login
  INSERT INTO daily_logins (user_id, streak_day, xp_earned, bonus_spin)
  VALUES (p_user_id, v_new_streak, v_xp_earned, v_free_spin_earned)
  ON CONFLICT (user_id, login_date) DO NOTHING;
  
  -- Apply XP multiplier on day 4
  IF v_cycle_day = 4 THEN
    PERFORM grant_xp_multiplier(p_user_id, 1.5, 24, 'daily_streak', 'Day 4 Login Reward: 1.5x XP for 24 hours');
    v_multiplier_applied := TRUE;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'streak', v_new_streak,
    'cycle_day', v_cycle_day,
    'xp_earned', v_xp_earned,
    'free_spin_earned', v_free_spin_earned,
    'multiplier_applied', v_multiplier_applied,
    'longest_streak', v_longest_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE: Level Up Reward function with 60 day expiry
-- ============================================
CREATE OR REPLACE FUNCTION grant_levelup_reward(
  p_user_id UUID,
  p_new_level INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_discount_value INTEGER;
  v_coupon_id UUID;
  v_reward_name TEXT;
BEGIN
  -- Determine reward based on level
  CASE 
    WHEN p_new_level >= 50 THEN 
      v_discount_value := 25;
      v_reward_name := '🏆 Master Level ' || p_new_level || ': 25% Discount';
    WHEN p_new_level >= 25 THEN 
      v_discount_value := 15;
      v_reward_name := '⭐ Elite Level ' || p_new_level || ': 15% Discount';
    WHEN p_new_level >= 10 THEN 
      v_discount_value := 10;
      v_reward_name := '🎯 Pro Level ' || p_new_level || ': 10% Discount';
    WHEN p_new_level >= 5 THEN 
      v_discount_value := 5;
      v_reward_name := '🌟 Level ' || p_new_level || ': 5% Discount';
    ELSE 
      -- No discount for levels below 5
      RETURN json_build_object('success', true, 'reward', 'none', 'level', p_new_level);
  END CASE;
  
  -- Create discount coupon - expires in 60 days
  INSERT INTO user_coupons (
    user_id, 
    code, 
    discount_type, 
    discount_value, 
    min_order_value, 
    source, 
    description,
    expires_at
  )
  VALUES (
    p_user_id,
    NULL, -- No code needed - selectable reward
    'percent'::discount_type,
    v_discount_value,
    0,
    'levelup'::coupon_source,
    v_reward_name,
    NOW() + INTERVAL '60 days'
  )
  RETURNING id INTO v_coupon_id;
  
  RETURN json_build_object(
    'success', true,
    'level', p_new_level,
    'reward', v_reward_name,
    'discount_value', v_discount_value,
    'coupon_id', v_coupon_id,
    'expires_in_days', 60
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- IMPORTANT: Run these 3 statements FIRST in a SEPARATE query!
-- ============================================
-- ALTER TYPE coupon_source ADD VALUE IF NOT EXISTS 'welcome';
-- ALTER TYPE coupon_source ADD VALUE IF NOT EXISTS 'spin_wheel';
-- ALTER TYPE coupon_source ADD VALUE IF NOT EXISTS 'levelup';
-- ============================================
-- Then run the rest of this migration.
-- ============================================

-- ============================================
-- Update existing welcome coupons to remove code requirement
-- ============================================
-- NOTE: This UPDATE is commented out because 'welcome' enum was just added
-- and new enum values cannot be used in the same transaction.
-- If you have existing welcome coupons from before, run this separately AFTER the migration:
-- 
-- UPDATE user_coupons 
-- SET code = NULL, description = '🎁 Welcome Gift: 10% Off Your First Order'
-- WHERE source = 'welcome' AND code IS NOT NULL AND used = false;

-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION handle_new_user_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_v2() TO service_role;
GRANT EXECUTE ON FUNCTION purchase_reward(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION spin_wheel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_reward_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_levelup_reward(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_levelup_reward(UUID, INTEGER) TO service_role;

