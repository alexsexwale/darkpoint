-- Run this in Supabase SQL Editor to diagnose the signup issue

-- 1. Check if the xp_action enum exists
SELECT EXISTS (
  SELECT 1 FROM pg_type WHERE typname = 'xp_action'
) AS xp_action_enum_exists;

-- 2. Check if generate_referral_code function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'generate_referral_code'
) AS generate_referral_code_exists;

-- 3. Check if user_profiles table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 4. Check if xp_transactions table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'xp_transactions'
ORDER BY ordinal_position;

-- 5. Check the current trigger
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 6. Check the handle_new_user function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 7. List all enum values for xp_action (if it exists)
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'xp_action';

-- 8. Test if we can manually insert into user_profiles (will fail if RLS blocks it)
-- This is commented out - uncomment to test
-- INSERT INTO user_profiles (id, username, display_name, referral_code, total_xp)
-- VALUES (gen_random_uuid(), 'test_user', 'Test User', 'DARK-TEST123', 100);

