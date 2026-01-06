-- Quick diagnostic to understand why profiles aren't being created
-- Run this in Supabase SQL Editor

-- 1. Check if handle_new_user trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if user_profiles table exists and its columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check recent auth.users to see if they have matching profiles
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.id as profile_id,
  p.total_xp,
  p.available_spins,
  CASE WHEN p.id IS NULL THEN 'NO PROFILE' ELSE 'HAS PROFILE' END as status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Check if xp_transactions exist for these users
SELECT 
  u.email,
  COUNT(x.id) as xp_transaction_count,
  COALESCE(SUM(x.amount), 0) as total_xp_from_transactions
FROM auth.users u
LEFT JOIN xp_transactions x ON u.id = x.user_id
GROUP BY u.email
ORDER BY u.email
LIMIT 10;

-- 5. Check RLS policies on user_profiles
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 6. Try to manually create profile for a test (replace USER_ID)
-- DO $$
-- DECLARE
--   v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with actual user ID
-- BEGIN
--   SELECT ensure_user_profile(v_user_id);
-- END $$;

