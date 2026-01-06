-- ============================================================
-- COMPREHENSIVE FIX: All Reward Systems
-- Run this in Supabase SQL Editor to fix:
-- 1. Welcome rewards for new users
-- 2. Daily login rewards
-- 3. XP transactions logging
-- ============================================================

-- ========================
-- STEP 1: Ensure all required tables exist
-- ========================

-- User profiles table (core)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  referral_code TEXT UNIQUE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  products_viewed INTEGER DEFAULT 0,
  categories_viewed INTEGER DEFAULT 0,
  single_order_max_value DECIMAL(10,2) DEFAULT 0,
  single_order_max_items INTEGER DEFAULT 0,
  available_spins INTEGER DEFAULT 0,
  newsletter_subscribed BOOLEAN DEFAULT FALSE,
  is_returning_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP transactions table
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily logins table
CREATE TABLE IF NOT EXISTS daily_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_of_streak INTEGER DEFAULT 1,
  xp_earned INTEGER DEFAULT 0,
  bonus_reward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, login_date)
);

-- User coupons table
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_subscribed BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deleted accounts tracking (for returning user detection)
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);

-- ========================
-- STEP 2: Add missing columns to existing tables
-- ========================

DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS products_viewed INTEGER DEFAULT 0;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS categories_viewed INTEGER DEFAULT 0;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_value DECIMAL(10,2) DEFAULT 0;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS single_order_max_items INTEGER DEFAULT 0;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT FALSE;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_returning_user BOOLEAN DEFAULT FALSE;
  ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;
  ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some columns may already exist: %', SQLERRM;
END $$;

-- ========================
-- STEP 3: Create/Update the new user trigger
-- ========================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_ref_code_used TEXT;
  v_is_returning BOOLEAN := FALSE;
  v_welcome_xp INT := 100;
  v_welcome_spins INT := 1;
BEGIN
  -- Extract data from metadata
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    v_username
  );
  
  v_ref_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  -- Check if this is a returning user
  SELECT EXISTS(
    SELECT 1 FROM deleted_accounts WHERE email = NEW.email
  ) INTO v_is_returning;
  
  -- If returning, no welcome bonuses
  IF v_is_returning THEN
    v_welcome_xp := 0;
    v_welcome_spins := 0;
  END IF;
  
  -- Generate unique referral code
  v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 4)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = v_referral_code) LOOP
    v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 4)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;
  
  -- Create user profile with welcome XP and spins
  INSERT INTO user_profiles (
    id, username, display_name, email, referral_code,
    total_xp, current_level, current_streak, longest_streak,
    total_spent, total_orders, total_reviews, total_referrals,
    available_spins, newsletter_subscribed, is_returning_user
  ) VALUES (
    NEW.id, v_username, v_display_name, NEW.email, v_referral_code,
    v_welcome_xp, 1, 0, 0,
    0, 0, 0, 0,
    v_welcome_spins, TRUE, v_is_returning
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(user_profiles.username, EXCLUDED.username),
    total_xp = CASE 
      WHEN user_profiles.total_xp IS NULL OR user_profiles.total_xp = 0 
      THEN EXCLUDED.total_xp 
      ELSE user_profiles.total_xp 
    END,
    available_spins = CASE 
      WHEN user_profiles.available_spins IS NULL OR user_profiles.available_spins = 0 
      THEN EXCLUDED.available_spins 
      ELSE user_profiles.available_spins 
    END;
  
  -- For new users only: Give welcome bonuses
  IF NOT v_is_returning THEN
    -- Log welcome XP transaction
    BEGIN
      INSERT INTO xp_transactions (user_id, amount, action, description)
      VALUES (NEW.id, v_welcome_xp, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not log XP transaction: %', SQLERRM;
    END;
    
    -- Create welcome discount reward (10% off, expires in 30 days)
    BEGIN
      INSERT INTO user_coupons (
        user_id, code, discount_type, discount_value, min_order_value,
        max_uses, uses_count, is_used, source, description, expires_at
      ) VALUES (
        NEW.id, NULL, 'percent', 10, 0,
        1, 0, FALSE, 'welcome', '🎁 Welcome Gift: 10% Off Your First Order',
        NOW() + INTERVAL '30 days'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not create welcome coupon: %', SQLERRM;
    END;
  END IF;
  
  -- Auto-subscribe to newsletter
  BEGIN
    INSERT INTO newsletter_subscriptions (email, user_id, source)
    VALUES (NEW.email, NEW.id, 'registration')
    ON CONFLICT (email) DO UPDATE SET
      user_id = NEW.id,
      is_subscribed = true,
      source = 'registration',
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not subscribe to newsletter: %', SQLERRM;
  END;
  
  -- Handle referral if provided
  IF v_ref_code_used IS NOT NULL AND v_ref_code_used != '' THEN
    BEGIN
      PERFORM process_referral_signup(NEW.id, v_ref_code_used);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Referral processing failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user warning for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================
-- STEP 4: Create/Update daily reward claim function
-- ========================

CREATE OR REPLACE FUNCTION claim_daily_reward_v2(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
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
    v_new_streak := COALESCE(v_profile.current_streak, 0) + 1;
  ELSIF v_profile.last_login_date IS NULL THEN
    v_new_streak := 1;
  ELSE
    v_new_streak := 1;  -- Streak broken
  END IF;

  v_longest_streak := GREATEST(COALESCE(v_profile.longest_streak, 0), v_new_streak);

  -- Calculate cycle day (1-7)
  v_cycle_day := ((v_new_streak - 1) % 7) + 1;

  -- Daily XP rewards (escalating)
  CASE v_cycle_day
    WHEN 1 THEN v_xp_earned := 5;
    WHEN 2 THEN v_xp_earned := 15;
    WHEN 3 THEN v_xp_earned := 25;
    WHEN 4 THEN v_xp_earned := 35;
    WHEN 5 THEN v_xp_earned := 50;
    WHEN 6 THEN v_xp_earned := 75;
    WHEN 7 THEN
      v_xp_earned := 100;
      v_free_spin_earned := TRUE;
    ELSE v_xp_earned := 10;
  END CASE;

  -- Update profile
  UPDATE user_profiles SET
    last_login_date = v_today,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    total_xp = COALESCE(total_xp, 0) + v_xp_earned,
    available_spins = CASE WHEN v_free_spin_earned THEN COALESCE(available_spins, 0) + 1 ELSE COALESCE(available_spins, 0) END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log XP transaction
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, v_xp_earned, 'daily_login', '🔥 Day ' || v_cycle_day || ' streak reward');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not log XP transaction: %', SQLERRM;
  END;

  -- Log daily login
  BEGIN
    INSERT INTO daily_logins (user_id, login_date, day_of_streak, xp_earned, bonus_reward)
    VALUES (
      p_user_id,
      v_today,
      v_new_streak,
      v_xp_earned,
      CASE WHEN v_free_spin_earned THEN 'free_spin' ELSE NULL END
    )
    ON CONFLICT (user_id, login_date) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not log daily login: %', SQLERRM;
  END;

  -- Apply XP multiplier on day 4
  IF v_cycle_day = 4 THEN
    BEGIN
      PERFORM grant_xp_multiplier(p_user_id, 1.5, 24, 'daily_streak', 'Day 4 Login Reward: 1.5x XP for 24 hours');
      v_multiplier_applied := TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_multiplier_applied := FALSE;
    END;
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
$$;

-- Fallback function
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN claim_daily_reward_v2(p_user_id);
END;
$$;

-- ========================
-- STEP 5: Grant permissions
-- ========================

GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION claim_daily_reward_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_reward(UUID) TO authenticated;

-- Table permissions
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access profiles" ON user_profiles;
CREATE POLICY "Service role full access profiles" ON user_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- XP transactions policies
DROP POLICY IF EXISTS "Users can view own XP" ON xp_transactions;
CREATE POLICY "Users can view own XP" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role insert XP" ON xp_transactions;
CREATE POLICY "Service role insert XP" ON xp_transactions
  FOR INSERT WITH CHECK (true);

-- Daily logins policies
DROP POLICY IF EXISTS "Users can view own daily logins" ON daily_logins;
CREATE POLICY "Users can view own daily logins" ON daily_logins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily logins" ON daily_logins;
CREATE POLICY "Users can insert own daily logins" ON daily_logins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User coupons policies
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
CREATE POLICY "Users can view own coupons" ON user_coupons
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manage coupons" ON user_coupons;
CREATE POLICY "Service role manage coupons" ON user_coupons
  FOR ALL USING (true);

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON xp_transactions TO authenticated;
GRANT SELECT, INSERT ON daily_logins TO authenticated;
GRANT SELECT ON user_coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON newsletter_subscriptions TO authenticated;

-- Service role needs full access
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON xp_transactions TO service_role;
GRANT ALL ON daily_logins TO service_role;
GRANT ALL ON user_coupons TO service_role;
GRANT ALL ON newsletter_subscriptions TO service_role;

-- ========================
-- STEP 6: Helper function to fix existing users
-- ========================

CREATE OR REPLACE FUNCTION grant_welcome_reward(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_profile user_profiles%ROWTYPE;
BEGIN
  -- Check if user already has a welcome reward
  SELECT EXISTS(
    SELECT 1 FROM user_coupons 
    WHERE user_id = p_user_id AND source = 'welcome'
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has welcome reward');
  END IF;
  
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Create the welcome reward
  INSERT INTO user_coupons (
    user_id, code, discount_type, discount_value, min_order_value,
    max_uses, uses_count, is_used, source, description, expires_at
  ) VALUES (
    p_user_id, NULL, 'percent', 10, 0,
    1, 0, FALSE, 'welcome', '🎁 Welcome Gift: 10% Off Your First Order',
    NOW() + INTERVAL '30 days'
  );
  
  -- Add welcome XP if user has 0 XP
  IF COALESCE(v_profile.total_xp, 0) = 0 THEN
    UPDATE user_profiles SET 
      total_xp = 100,
      available_spins = COALESCE(available_spins, 0) + 1
    WHERE id = p_user_id;
    
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (p_user_id, 100, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Welcome reward granted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION grant_welcome_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_welcome_reward(UUID) TO service_role;

-- ========================
-- DONE!
-- ========================
SELECT 'All reward systems fixed! New users will receive:' as status
UNION ALL
SELECT '- 100 XP welcome bonus'
UNION ALL
SELECT '- 1 free spin'
UNION ALL
SELECT '- 10% off first order coupon (30 days)'
UNION ALL
SELECT '- Newsletter subscription'
UNION ALL
SELECT ''
UNION ALL
SELECT 'To fix existing user, run: SELECT grant_welcome_reward(''your-user-uuid'');';

