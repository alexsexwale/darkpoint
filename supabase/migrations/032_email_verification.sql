-- ============================================
-- Migration: Email Verification & Fix User Profile Creation
-- ============================================
-- 1. Fixes the user profile creation trigger
-- 2. Adds email_verified tracking to user_profiles
-- 3. Ensures proper trigger execution
-- ============================================

-- ============================================
-- Add missing columns to user_profiles
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT TRUE;

-- ============================================
-- SIMPLIFIED: Handle New User Function
-- ============================================
-- This is a simplified, robust version that won't fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_ref_code_used TEXT;
  v_is_returning BOOLEAN := FALSE;
  v_email_verified BOOLEAN := FALSE;
BEGIN
  -- Check if email is already verified (Supabase may auto-verify in some cases)
  v_email_verified := NEW.email_confirmed_at IS NOT NULL;
  
  -- Check if this email was previously deleted (returning user)
  SELECT EXISTS (
    SELECT 1 FROM deleted_accounts WHERE LOWER(email) = LOWER(NEW.email)
  ) INTO v_is_returning;
  
  -- Extract username from metadata or email
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  -- Clean username (lowercase, remove special chars)
  v_username := LOWER(REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_]', '', 'g'));
  IF LENGTH(v_username) < 3 THEN
    v_username := 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  END IF;
  
  -- Extract display name
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CONCAT_WS(' ', 
      NEW.raw_user_meta_data->>'first_name', 
      NEW.raw_user_meta_data->>'last_name'
    )
  );
  IF v_display_name = '' THEN v_display_name := NULL; END IF;
  
  -- Extract referral code if used during signup
  v_ref_code_used := NEW.raw_user_meta_data->>'referral_code';
  
  -- Generate unique referral code for this user
  v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  
  -- Ensure uniqueness (try a few times)
  FOR i IN 1..5 LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = v_referral_code);
    v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 4)) || FLOOR(RANDOM() * 90000 + 10000)::TEXT;
  END LOOP;
  
  -- Create user profile
  INSERT INTO user_profiles (
    id,
    username,
    display_name,
    email,
    referral_code,
    email_verified,
    email_verified_at,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    total_spent,
    total_orders,
    total_reviews,
    referral_count,
    available_spins,
    newsletter_subscribed,
    is_returning_user
  ) VALUES (
    NEW.id,
    v_username,
    v_display_name,
    NEW.email,
    v_referral_code,
    v_email_verified,
    CASE WHEN v_email_verified THEN NOW() ELSE NULL END,
    CASE WHEN v_is_returning THEN 0 ELSE 100 END, -- 100 XP for new users
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    CASE WHEN v_is_returning THEN 0 ELSE 1 END, -- 1 free spin for new users
    TRUE, -- Auto-subscribe to newsletter
    v_is_returning
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    email_verified = EXCLUDED.email_verified,
    email_verified_at = EXCLUDED.email_verified_at;
  
  -- Log welcome XP if new user (not returning)
  IF NOT v_is_returning THEN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (NEW.id, 100, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!')
    ON CONFLICT DO NOTHING;
    
    -- Create welcome discount reward (NO CODE - selectable in cart/checkout)
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
      NULL,
      'percent',
      10,
      0,
      1,
      0,
      'welcome',
      '🎁 Welcome Gift: 10% Off Your First Order',
      NOW() + INTERVAL '30 days'
    )
    ON CONFLICT DO NOTHING;
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
    -- Simple referral processing - award XP to referrer
    INSERT INTO xp_transactions (user_id, amount, action, description)
    SELECT up.id, 50, 'referral', 'Referral bonus: ' || NEW.email
    FROM user_profiles up
    WHERE up.referral_code = v_ref_code_used
    LIMIT 1;
    
    -- Update referrer's referral count
    UPDATE user_profiles 
    SET referral_count = referral_count + 1
    WHERE referral_code = v_ref_code_used;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to sync email verification status
-- ============================================
CREATE OR REPLACE FUNCTION sync_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When auth.users email_confirmed_at changes, update user_profiles
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    UPDATE user_profiles
    SET 
      email_verified = TRUE,
      email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Drop and recreate triggers
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger for email verification sync
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_email_verification();

-- ============================================
-- Function to check if user is verified
-- ============================================
CREATE OR REPLACE FUNCTION is_email_verified(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_verified BOOLEAN;
BEGIN
  -- First check auth.users (source of truth)
  SELECT email_confirmed_at IS NOT NULL INTO v_verified
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Also update user_profiles if they're out of sync
  IF v_verified THEN
    UPDATE user_profiles
    SET email_verified = TRUE,
        email_verified_at = COALESCE(email_verified_at, NOW())
    WHERE id = p_user_id AND NOT email_verified;
  END IF;
  
  RETURN COALESCE(v_verified, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to resend verification email (called from API)
-- ============================================
CREATE OR REPLACE FUNCTION can_resend_verification(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_last_sent TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN json_build_object('allowed', false, 'error', 'User not found');
  END IF;
  
  IF v_user.email_confirmed_at IS NOT NULL THEN
    RETURN json_build_object('allowed', false, 'error', 'Email already verified');
  END IF;
  
  -- Check if confirmation was sent recently (throttle to once per 60 seconds)
  IF v_user.confirmation_sent_at IS NOT NULL AND 
     v_user.confirmation_sent_at > NOW() - INTERVAL '60 seconds' THEN
    RETURN json_build_object(
      'allowed', false, 
      'error', 'Please wait before requesting another verification email',
      'wait_seconds', EXTRACT(EPOCH FROM (v_user.confirmation_sent_at + INTERVAL '60 seconds' - NOW()))::INTEGER
    );
  END IF;
  
  RETURN json_build_object('allowed', true, 'email', v_user.email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Sync existing users' verification status
-- ============================================
UPDATE user_profiles up
SET 
  email_verified = TRUE,
  email_verified_at = au.email_confirmed_at
FROM auth.users au
WHERE up.id = au.id
  AND au.email_confirmed_at IS NOT NULL
  AND up.email_verified IS NOT TRUE;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION sync_email_verification() TO service_role;
GRANT EXECUTE ON FUNCTION is_email_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_verified(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION can_resend_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_resend_verification(UUID) TO service_role;

-- ============================================
-- Create index for faster lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_verified ON user_profiles(email_verified);

-- ============================================
-- Verify trigger setup
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE WARNING 'Trigger on_auth_user_created was not created!';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created created successfully';
  END IF;
END $$;

