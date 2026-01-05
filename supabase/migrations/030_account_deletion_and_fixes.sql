-- ================================================
-- Migration: 030_account_deletion_and_fixes.sql
-- Description: Account deletion, returning user handling, and Day 1 streak fix
-- ================================================

-- ============================================
-- TABLE: Deleted Accounts Registry (for tracking returning users)
-- ============================================
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  original_user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  -- Keep track of what they had (for analytics)
  final_xp INTEGER DEFAULT 0,
  final_level INTEGER DEFAULT 1,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  UNIQUE(email, original_user_id)
);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);

-- ============================================
-- FUNCTION: Check if email is from a returning (deleted) user
-- ============================================
CREATE OR REPLACE FUNCTION is_returning_user(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM deleted_accounts WHERE LOWER(email) = LOWER(p_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Delete User Account
-- Anonymizes data if user has orders, fully deletes otherwise
-- ============================================
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID, p_reason TEXT DEFAULT 'user_requested')
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_email TEXT;
  v_has_orders BOOLEAN;
  v_order_count INTEGER;
  v_anon_name TEXT;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  -- Check if user has orders
  SELECT COUNT(*) INTO v_order_count FROM orders WHERE user_id = p_user_id;
  v_has_orders := v_order_count > 0;
  
  -- Register this email as deleted (to prevent welcome bonuses on re-registration)
  INSERT INTO deleted_accounts (
    email, 
    original_user_id, 
    reason,
    final_xp,
    final_level,
    total_orders,
    total_spent
  )
  VALUES (
    v_email,
    p_user_id,
    p_reason,
    v_profile.total_xp,
    v_profile.current_level,
    v_profile.total_orders,
    v_profile.total_spent
  )
  ON CONFLICT (email, original_user_id) DO UPDATE SET
    deleted_at = NOW(),
    reason = p_reason,
    final_xp = v_profile.total_xp,
    final_level = v_profile.current_level;

  IF v_has_orders THEN
    -- ANONYMIZE: Keep order data but remove personal info
    v_anon_name := 'Deleted User ' || LEFT(p_user_id::TEXT, 8);
    
    -- Update orders to remove personal data but keep analytics
    UPDATE orders SET
      shipping_name = v_anon_name,
      shipping_phone = NULL,
      billing_name = v_anon_name,
      billing_phone = NULL,
      billing_email = NULL,
      customer_notes = NULL,
      admin_notes = COALESCE(admin_notes, '') || ' [Account deleted: ' || NOW()::TEXT || ']'
    WHERE user_id = p_user_id;
    
    -- Anonymize addresses
    UPDATE user_addresses SET
      name = v_anon_name,
      phone = NULL,
      address_line1 = 'Deleted',
      address_line2 = NULL,
      instructions = NULL
    WHERE user_id = p_user_id;
    
    -- Keep reviews but anonymize author
    UPDATE product_reviews SET
      author_name = v_anon_name
    WHERE user_id = p_user_id;
  ELSE
    -- No orders - can fully delete related data
    DELETE FROM user_addresses WHERE user_id = p_user_id;
    DELETE FROM product_reviews WHERE user_id = p_user_id;
    DELETE FROM review_helpful_votes WHERE user_id = p_user_id;
    DELETE FROM review_reports WHERE user_id = p_user_id;
  END IF;

  -- Always delete gamification data (can be recreated)
  DELETE FROM xp_transactions WHERE user_id = p_user_id;
  DELETE FROM user_achievements WHERE user_id = p_user_id;
  DELETE FROM daily_logins WHERE user_id = p_user_id;
  DELETE FROM user_coupons WHERE user_id = p_user_id;
  DELETE FROM user_activity_log WHERE user_id = p_user_id;
  DELETE FROM wishlists WHERE user_id = p_user_id;
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  
  -- Delete newsletter subscription
  DELETE FROM newsletter_subscriptions WHERE user_id = p_user_id;
  
  -- Delete user profile
  DELETE FROM user_profiles WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'anonymized', v_has_orders,
    'orders_preserved', v_order_count,
    'message', CASE 
      WHEN v_has_orders THEN 'Account deleted. Order history preserved with anonymized data.'
      ELSE 'Account and all data deleted successfully.'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE: Handle New User Trigger (check for returning users)
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_is_returning BOOLEAN;
  v_welcome_xp INTEGER;
  v_welcome_spins INTEGER;
  v_ref_code_used TEXT;
BEGIN
  -- Check if this is a returning user (previously deleted account)
  SELECT EXISTS(
    SELECT 1 FROM deleted_accounts WHERE LOWER(email) = LOWER(NEW.email)
  ) INTO v_is_returning;
  
  -- Set welcome bonuses based on new vs returning user
  IF v_is_returning THEN
    v_welcome_xp := 0;      -- No XP for returning users
    v_welcome_spins := 0;   -- No free spin for returning users
  ELSE
    v_welcome_xp := 100;    -- 100 XP for new users
    v_welcome_spins := 1;   -- 1 free spin for new users
  END IF;
  
  -- Extract username
  v_username := LOWER(LEFT(COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  ), 30));
  
  -- Extract display name
  v_display_name := LEFT(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  ), 50);
  
  -- Generate unique referral code
  v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  
  -- Ensure referral code is unique
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = v_referral_code) LOOP
    v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;
  
  -- Get referral code from signup if any
  v_ref_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  -- Create user profile with appropriate bonuses
  INSERT INTO public.user_profiles (
    id,
    email,
    username,
    display_name,
    referral_code,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    total_spent,
    total_orders,
    total_reviews,
    referral_count,
    available_spins,
    store_credit,
    is_returning_user
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_display_name,
    v_referral_code,
    v_welcome_xp,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    v_welcome_spins,
    0,
    v_is_returning
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(user_profiles.username, EXCLUDED.username);
  
  -- Log welcome XP if new user
  IF NOT v_is_returning AND v_welcome_xp > 0 THEN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (NEW.id, v_welcome_xp, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!')
    ON CONFLICT DO NOTHING;
    
    -- Create welcome coupon for new users
    INSERT INTO user_coupons (
      user_id,
      code,
      discount_type,
      discount_value,
      min_order_value,
      max_uses,
      uses_count,
      source,
      expires_at
    ) VALUES (
      NEW.id,
      'WELCOME-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 8)),
      'percent',
      10,
      0,
      1,
      0,
      'welcome',
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add is_returning_user column to user_profiles if not exists
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_returning_user BOOLEAN DEFAULT FALSE;

-- ============================================
-- UPDATE: Claim Daily Reward (Day 1 = 0 XP)
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
  v_free_spin_earned BOOLEAN := FALSE;
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
    v_new_streak := v_profile.current_streak + 1;
  ELSIF v_profile.last_login_date = v_today THEN
    v_new_streak := v_profile.current_streak;
  ELSE
    -- Streak broken or first login
    v_new_streak := 1;
  END IF;
  
  -- Update longest streak
  v_longest_streak := GREATEST(v_new_streak, v_profile.longest_streak);
  
  -- Calculate cycle day (1-7)
  v_cycle_day := ((v_new_streak - 1) % 7) + 1;
  
  -- Calculate XP based on cycle day
  -- DAY 1 = 0 XP (just "welcome back" / starting streak)
  -- Days 2-7 get increasing XP
  v_xp_earned := CASE v_cycle_day
    WHEN 1 THEN 0   -- Day 1: No XP, just starting streak
    WHEN 2 THEN 20  -- Day 2: Start earning
    WHEN 3 THEN 30
    WHEN 4 THEN 40
    WHEN 5 THEN 50
    WHEN 6 THEN 75
    WHEN 7 THEN 100
    ELSE 0
  END;
  
  -- Determine bonus reward based on cycle day
  v_bonus_reward := CASE v_cycle_day
    WHEN 2 THEN '+25 Bonus XP!'
    WHEN 4 THEN '1.5x XP for 24 hours'
    WHEN 5 THEN 'Free Spin!'
    WHEN 6 THEN '+100 Bonus XP!'
    WHEN 7 THEN '2 Free Spins!'
    ELSE NULL
  END;
  
  -- Check for free spin days
  IF v_cycle_day = 5 THEN
    v_free_spin_earned := TRUE;
  ELSIF v_cycle_day = 7 THEN
    v_free_spin_earned := TRUE;
  END IF;
  
  -- Insert daily login record
  INSERT INTO daily_logins (user_id, login_date, day_of_streak, xp_earned, bonus_reward)
  VALUES (p_user_id, v_today, v_new_streak, v_xp_earned, v_bonus_reward)
  ON CONFLICT (user_id, login_date) DO NOTHING;
  
  -- Update user profile
  UPDATE user_profiles SET
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    last_login_date = v_today,
    total_xp = total_xp + v_xp_earned,
    available_spins = CASE 
      WHEN v_cycle_day = 5 THEN available_spins + 1
      WHEN v_cycle_day = 7 THEN available_spins + 2
      ELSE available_spins 
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log XP transaction (only if XP earned)
  IF v_xp_earned > 0 THEN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, v_xp_earned, 'daily_login', 'Day ' || v_new_streak || ' login bonus (Day ' || v_cycle_day || ' of cycle)');
  END IF;
  
  -- Apply XP multiplier on day 4
  IF v_cycle_day = 4 THEN
    INSERT INTO xp_multipliers (user_id, multiplier, expires_at, reason)
    VALUES (p_user_id, 1.5, NOW() + INTERVAL '24 hours', 'Day 4 Login Reward: 1.5x XP for 24 hours')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Build result
  v_result := json_build_object(
    'success', true,
    'streak', v_new_streak,
    'longest_streak', v_longest_streak,
    'cycle_day', v_cycle_day,
    'xp_earned', v_xp_earned,
    'bonus_reward', v_bonus_reward,
    'free_spin_earned', v_free_spin_earned,
    'total_xp', v_profile.total_xp + v_xp_earned,
    'day_1_message', CASE WHEN v_cycle_day = 1 THEN 'Streak started! Come back tomorrow to earn XP!' ELSE NULL END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION is_returning_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_returning_user(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_daily_reward(UUID) TO authenticated;

-- RLS for deleted_accounts
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access to deleted_accounts" ON deleted_accounts;
CREATE POLICY "Service role access to deleted_accounts" ON deleted_accounts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

