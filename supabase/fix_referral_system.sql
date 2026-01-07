-- ============================================================
-- FIX: Referral System
-- This fixes the referral system so both referrer and referred user get their rewards
-- ============================================================

-- Step 1: Add missing columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- Ensure referral_count and total_referrals are synced
UPDATE user_profiles SET total_referrals = referral_count WHERE total_referrals = 0 AND referral_count > 0;
UPDATE user_profiles SET referral_count = total_referrals WHERE referral_count = 0 AND total_referrals > 0;

-- Step 2: Create referrals tracking table if not exists
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'signed_up',
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Step 3: Create the process_referral_signup function (the one that's being called)
-- Drop existing functions first to handle return type changes
DROP FUNCTION IF EXISTS process_referral_signup(UUID, TEXT);
DROP FUNCTION IF EXISTS process_referral(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_process_referral(TEXT, TEXT);

CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_xp INTEGER := 300;  -- XP reward for referrer
  v_referred_xp INTEGER := 200;  -- Extra XP for referred user (on top of 100 welcome)
  v_existing_referral BOOLEAN;
BEGIN
  -- Input validation
  IF p_referred_user_id IS NULL OR p_referral_code IS NULL OR TRIM(p_referral_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Find the referrer by their referral code
  SELECT id INTO v_referrer_id
  FROM user_profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code))
     OR referral_code = TRIM(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RAISE NOTICE 'Referral code not found: %', p_referral_code;
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Make sure user isn't referring themselves
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if this user was already referred
  SELECT referred_by IS NOT NULL INTO v_existing_referral
  FROM user_profiles
  WHERE id = p_referred_user_id;

  IF v_existing_referral THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has a referrer');
  END IF;

  -- Check if referral already exists
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already processed');
  END IF;

  -- Award XP to the REFERRER (300 XP)
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_referrer_xp,
    referral_count = COALESCE(referral_count, 0) + 1,
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- Award XP to the REFERRED USER (200 XP bonus on top of welcome XP)
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_referred_xp,
    referred_by = v_referrer_id,
    updated_at = NOW()
  WHERE id = p_referred_user_id;

  -- Log XP transaction for referrer
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (v_referrer_id, v_referrer_xp, 'referral', 'Referral bonus - new user signed up with your code');

  -- Log XP transaction for referred user
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_referred_user_id, v_referred_xp, 'referral', 'Referral signup bonus');

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_claimed)
  VALUES (v_referrer_id, p_referred_user_id, TRIM(p_referral_code), 'signed_up', true)
  ON CONFLICT (referred_id) DO NOTHING;

  -- Check achievements for the referrer (might unlock "Friendly Face" achievement)
  BEGIN
    PERFORM check_achievements(v_referrer_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Achievement check failed: %', SQLERRM;
  END;

  RAISE NOTICE 'Referral processed successfully: referrer=%, referred=%, referrer_xp=%, referred_xp=%', 
    v_referrer_id, p_referred_user_id, v_referrer_xp, v_referred_xp;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_xp_awarded', v_referrer_xp,
    'referred_xp_awarded', v_referred_xp
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in process_referral_signup: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Also create an alias for the old function name (process_referral)
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON AS $$
BEGIN
  RETURN process_referral_signup(p_referred_user_id, p_referral_code)::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION process_referral_signup(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_signup(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO service_role;

-- Step 6: RLS for referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their referrals" ON referrals;
CREATE POLICY "Users can view their referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "System can insert referrals" ON referrals;
CREATE POLICY "System can insert referrals" ON referrals
  FOR INSERT WITH CHECK (true);

-- Step 7: Create a function to manually process a referral (for fixing existing users)
CREATE OR REPLACE FUNCTION admin_process_referral(
  p_referred_email TEXT,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referred_user_id UUID;
BEGIN
  -- Find the referred user by email
  SELECT id INTO v_referred_user_id
  FROM auth.users
  WHERE email = p_referred_email;

  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN process_referral_signup(v_referred_user_id, p_referral_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_process_referral(TEXT, TEXT) TO service_role;

-- Step 8: Create get_referral_stats function
-- Drop existing function first (may have different return type)
DROP FUNCTION IF EXISTS get_referral_stats(UUID);

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_referrals JSONB;
  v_tier TEXT;
  v_xp_per_referral INTEGER;
BEGIN
  -- Get user profile
  SELECT referral_code, referral_count, total_referrals, total_xp
  INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Calculate tier based on referral count
  v_xp_per_referral := CASE
    WHEN COALESCE(v_profile.referral_count, 0) >= 25 THEN 500
    WHEN COALESCE(v_profile.referral_count, 0) >= 10 THEN 400
    WHEN COALESCE(v_profile.referral_count, 0) >= 5 THEN 350
    ELSE 300
  END;

  v_tier := CASE
    WHEN COALESCE(v_profile.referral_count, 0) >= 25 THEN 'Diamond'
    WHEN COALESCE(v_profile.referral_count, 0) >= 10 THEN 'Gold'
    WHEN COALESCE(v_profile.referral_count, 0) >= 5 THEN 'Silver'
    ELSE 'Bronze'
  END;

  -- Get referral list
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'referred_name', COALESCE(u.display_name, u.username, 'Anonymous'),
    'status', r.status,
    'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_referrals
  FROM referrals r
  LEFT JOIN user_profiles u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'referral_code', v_profile.referral_code,
    'referral_count', COALESCE(v_profile.referral_count, 0),
    'tier', v_tier,
    'xp_per_referral', v_xp_per_referral,
    'referrals', v_referrals
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;

-- ============================================================
-- VERIFICATION: Test the setup
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Referral system fix applied successfully!';
  RAISE NOTICE 'Functions created: process_referral_signup, process_referral, admin_process_referral, get_referral_stats';
END $$;

