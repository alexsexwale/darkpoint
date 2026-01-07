-- ============================================================
-- DIAGNOSE REFERRAL SYSTEM
-- Run this to check what's happening with referrals
-- ============================================================

-- 1. Check if the referrer exists and has the right referral code
SELECT 
  id,
  username,
  display_name,
  referral_code,
  referral_count,
  total_referrals,
  total_xp
FROM user_profiles 
WHERE referral_code LIKE '%ALEX%' OR username LIKE '%alex%'
ORDER BY created_at DESC;

-- 2. Check the most recently created users and their referral metadata
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'referral_code' as referral_code_used,
  u.raw_user_meta_data->>'username' as username,
  p.referred_by,
  p.total_xp,
  p.referral_count
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 3. Check the referrals table
SELECT * FROM referrals ORDER BY created_at DESC LIMIT 10;

-- 4. Check XP transactions for referral type
SELECT * FROM xp_transactions WHERE action = 'referral' ORDER BY created_at DESC LIMIT 10;

-- 5. Check if process_referral_signup function exists
SELECT proname, prorettype::regtype 
FROM pg_proc 
WHERE proname IN ('process_referral_signup', 'process_referral', 'handle_new_user');

-- 6. Check the handle_new_user trigger
SELECT tgname, tgenabled, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- ============================================================
-- MANUAL FIX: Process referral for the new user
-- Replace 'NEW_USER_EMAIL' with the actual email of the new user
-- Replace 'DARK-ALEX9043' with the actual referral code used
-- ============================================================

-- To manually process the referral, run this:
-- SELECT process_referral_signup(
--   (SELECT id FROM auth.users WHERE email = 'NEW_USER_EMAIL'),
--   'DARK-ALEX9043'
-- );

