-- ============================================================
-- FIX: Purchase-Based Referral System
-- Referrers only get credited when the referred user makes their first purchase
-- This prevents XP farming through fake accounts
-- ============================================================

-- Step 1: Update process_referral_signup to NOT award XP to referrer
-- Only award 200 XP to the new user and mark referral as PENDING

DROP FUNCTION IF EXISTS process_referral_signup(UUID, TEXT);

CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_xp INTEGER := 200;  -- XP for referred user (immediate)
  v_existing_referral BOOLEAN;
  v_already_referred BOOLEAN;
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

  -- Check if this user was already referred (has referred_by set)
  SELECT referred_by IS NOT NULL INTO v_already_referred
  FROM user_profiles
  WHERE id = p_referred_user_id;

  IF v_already_referred THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has a referrer');
  END IF;

  -- Check if referral already exists in referrals table
  SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_id = p_referred_user_id) INTO v_existing_referral;
  
  IF v_existing_referral THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already processed');
  END IF;

  -- Award XP to the REFERRED USER only (200 XP bonus) - immediate incentive
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_referred_xp,
    referred_by = v_referrer_id,
    updated_at = NOW()
  WHERE id = p_referred_user_id;

  -- Log XP transaction for referred user
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_referred_user_id, v_referred_xp, 'referral', 'Referral signup bonus - make a purchase to reward your friend!');

  -- Create referral record with status = 'pending' (NOT rewarded yet)
  -- Referrer will get their XP when this user makes their first purchase
  BEGIN
    INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_claimed)
    VALUES (v_referrer_id, p_referred_user_id, TRIM(p_referral_code), 'pending', false);
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Referral record already exists for user %', p_referred_user_id;
  END;

  RAISE NOTICE 'Referral signup processed: referrer=%, referred=%, status=pending (awaiting purchase)', 
    v_referrer_id, p_referred_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referred_xp_awarded', v_referred_xp,
    'status', 'pending',
    'message', 'Referral recorded. Referrer will be rewarded when you make your first purchase!'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in process_referral_signup: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create complete_referral_on_purchase function
-- Called after a successful payment to reward the referrer

DROP FUNCTION IF EXISTS complete_referral_on_purchase(UUID);

CREATE OR REPLACE FUNCTION complete_referral_on_purchase(
  p_buyer_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_referral_count INTEGER;
  v_referrer_xp INTEGER;
  v_referral_id UUID;
  v_referred_name TEXT;
BEGIN
  -- Check if this buyer was referred and referral is still pending
  SELECT 
    r.id,
    r.referrer_id,
    COALESCE(up.referral_count, 0),
    COALESCE(rp.display_name, rp.username, 'A friend')
  INTO v_referral_id, v_referrer_id, v_referrer_referral_count, v_referred_name
  FROM referrals r
  JOIN user_profiles up ON up.id = r.referrer_id
  LEFT JOIN user_profiles rp ON rp.id = r.referred_id
  WHERE r.referred_id = p_buyer_user_id
    AND r.status = 'pending'
    AND r.reward_claimed = false;

  -- No pending referral for this user
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'No pending referral for this user'
    );
  END IF;

  -- Calculate XP based on referrer's CURRENT tier
  v_referrer_xp := CASE
    WHEN v_referrer_referral_count >= 25 THEN 750  -- Diamond tier
    WHEN v_referrer_referral_count >= 10 THEN 500  -- Gold tier
    WHEN v_referrer_referral_count >= 5 THEN 400   -- Silver tier
    ELSE 300  -- Bronze tier (0-4 referrals)
  END;

  -- Award XP to the REFERRER
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_referrer_xp,
    referral_count = COALESCE(referral_count, 0) + 1,
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- Log XP transaction for referrer with tier info
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (v_referrer_id, v_referrer_xp, 'referral', 
    v_referred_name || ' made their first purchase! (' || 
    CASE
      WHEN v_referrer_referral_count >= 25 THEN 'Diamond'
      WHEN v_referrer_referral_count >= 10 THEN 'Gold'
      WHEN v_referrer_referral_count >= 5 THEN 'Silver'
      ELSE 'Bronze'
    END || ' tier bonus)');

  -- Update referral status to completed
  UPDATE referrals SET
    status = 'completed',
    reward_claimed = true,
    updated_at = NOW()
  WHERE id = v_referral_id;

  -- Check achievements for the referrer
  BEGIN
    PERFORM check_achievements(v_referrer_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Achievement check failed: %', SQLERRM;
  END;

  RAISE NOTICE 'Referral completed! Referrer % earned % XP from referred user %', 
    v_referrer_id, v_referrer_xp, p_buyer_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_xp_awarded', v_referrer_xp,
    'tier', CASE
      WHEN v_referrer_referral_count >= 25 THEN 'Diamond'
      WHEN v_referrer_referral_count >= 10 THEN 'Gold'
      WHEN v_referrer_referral_count >= 5 THEN 'Silver'
      ELSE 'Bronze'
    END,
    'status', 'completed'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in complete_referral_on_purchase: %', SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Update the fallback function
DROP FUNCTION IF EXISTS process_referral(UUID, TEXT);

CREATE OR REPLACE FUNCTION process_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON AS $$
BEGIN
  RETURN process_referral_signup(p_referred_user_id, p_referral_code)::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add updated_at column to referrals table if not exists
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION process_referral_signup(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_signup(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_referral_on_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_referral_on_purchase(UUID) TO service_role;

-- Step 6: Create a function to get referral stats with pending/completed breakdown
DROP FUNCTION IF EXISTS get_referral_stats(UUID);

CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_pending_referrals JSONB;
  v_completed_referrals JSONB;
  v_pending_count INTEGER;
  v_completed_count INTEGER;
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

  -- Calculate tier based on completed referral count
  v_xp_per_referral := CASE
    WHEN COALESCE(v_profile.referral_count, 0) >= 25 THEN 750
    WHEN COALESCE(v_profile.referral_count, 0) >= 10 THEN 500
    WHEN COALESCE(v_profile.referral_count, 0) >= 5 THEN 400
    ELSE 300
  END;

  v_tier := CASE
    WHEN COALESCE(v_profile.referral_count, 0) >= 25 THEN 'Diamond'
    WHEN COALESCE(v_profile.referral_count, 0) >= 10 THEN 'Gold'
    WHEN COALESCE(v_profile.referral_count, 0) >= 5 THEN 'Silver'
    ELSE 'Bronze'
  END;

  -- Get pending referrals (signed up but no purchase yet)
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'referred_name', COALESCE(u.display_name, u.username, 'Anonymous'),
      'status', 'pending',
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC), '[]'::jsonb),
    COUNT(*)
  INTO v_pending_referrals, v_pending_count
  FROM referrals r
  LEFT JOIN user_profiles u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id AND r.status IN ('pending_purchase', 'pending');

  -- Get completed referrals (made a purchase)
  SELECT 
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'referred_name', COALESCE(u.display_name, u.username, 'Anonymous'),
      'status', r.status,
      'created_at', r.created_at,
      'completed_at', r.updated_at
    ) ORDER BY r.updated_at DESC), '[]'::jsonb),
    COUNT(*)
  INTO v_completed_referrals, v_completed_count
  FROM referrals r
  LEFT JOIN user_profiles u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id AND r.status = 'completed';

  RETURN jsonb_build_object(
    'success', true,
    'referral_code', v_profile.referral_code,
    'pending_count', v_pending_count,
    'completed_count', v_completed_count,
    'total_referral_count', COALESCE(v_profile.referral_count, 0),
    'tier', v_tier,
    'xp_per_referral', v_xp_per_referral,
    'pending_referrals', v_pending_referrals,
    'completed_referrals', v_completed_referrals
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Purchase-based referral system applied!';
  RAISE NOTICE '';
  RAISE NOTICE 'New Flow:';
  RAISE NOTICE '  1. User signs up with referral code → Gets 200 XP immediately';
  RAISE NOTICE '  2. Referral marked as PENDING (referrer not rewarded yet)';
  RAISE NOTICE '  3. When referred user makes first purchase → Referrer gets tier XP';
  RAISE NOTICE '  4. Referral marked as COMPLETED';
  RAISE NOTICE '';
  RAISE NOTICE 'This prevents XP farming through fake accounts!';
END $$;

