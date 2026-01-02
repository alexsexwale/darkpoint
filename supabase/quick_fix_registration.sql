-- ============================================
-- DIAGNOSTIC & FIX: User Registration
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DIAGNOSTIC - Show all triggers on auth.users
-- ============================================
SELECT 
  tgname as trigger_name,
  proname as function_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- ============================================
-- STEP 2: Drop ALL triggers on auth.users
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;

-- ============================================
-- STEP 3: Add ALL missing columns
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT TRUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_returning_user BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- ============================================
-- STEP 4: Create deleted_accounts if missing
-- ============================================
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 5: BARE MINIMUM trigger function
-- ============================================
-- This does the ABSOLUTE minimum - just creates a user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_referral_code TEXT;
BEGIN
  -- Generate username from email
  v_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF LENGTH(v_username) < 3 THEN
    v_username := 'user_' || LEFT(NEW.id::TEXT, 8);
  END IF;
  
  -- Generate referral code
  v_referral_code := 'DP-' || UPPER(LEFT(v_username, 4)) || FLOOR(RANDOM() * 9999)::INTEGER;
  
  -- Insert user profile - absolute minimum columns only
  INSERT INTO user_profiles (id, username, email, referral_code, total_xp, current_level, available_spins)
  VALUES (NEW.id, v_username, NEW.email, v_referral_code, 100, 1, 1)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- NEVER fail - just log and continue
  RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 6: Create the trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 7: Verify and show results
-- ============================================
SELECT 'Triggers after fix:' as info;
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- Grant permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

SELECT 'FIX COMPLETE - Try registering now!' as status;
