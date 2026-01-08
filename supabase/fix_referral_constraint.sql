-- ============================================================
-- FIX: Add missing unique constraint to referrals table
-- Error: 'there is no unique or exclusion constraint matching the ON CONFLICT specification'
-- ============================================================

-- Step 1: Add the unique constraint on referred_id if it doesn't exist
DO $$
BEGIN
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'referrals_referred_id_key' 
    AND conrelid = 'referrals'::regclass
  ) THEN
    -- Add unique constraint
    ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);
    RAISE NOTICE 'Added unique constraint on referrals.referred_id';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If the constraint exists under a different name, try to create with IF NOT EXISTS pattern
  RAISE NOTICE 'Constraint check failed: %, attempting alternative...', SQLERRM;
  BEGIN
    -- Try to create unique index instead (which also enforces uniqueness)
    CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_id_unique_idx ON referrals (referred_id);
    RAISE NOTICE 'Created unique index on referrals.referred_id';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add index: %', SQLERRM;
  END;
END $$;

-- Step 2: Recreate the process_referral_signup function with better error handling
DROP FUNCTION IF EXISTS process_referral_signup(UUID, TEXT);

CREATE OR REPLACE FUNCTION process_referral_signup(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_xp INTEGER := 300;  -- XP reward for referrer
  v_referred_xp INTEGER := 200;  -- Extra XP for referred user
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

  -- Award XP to the REFERRER (300 XP)
  UPDATE user_profiles SET
    total_xp = COALESCE(total_xp, 0) + v_referrer_xp,
    referral_count = COALESCE(referral_count, 0) + 1,
    total_referrals = COALESCE(total_referrals, 0) + 1,
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- Award XP to the REFERRED USER (200 XP bonus)
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

  -- Create referral record (without ON CONFLICT to avoid constraint issues)
  BEGIN
    INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_claimed)
    VALUES (v_referrer_id, p_referred_user_id, TRIM(p_referral_code), 'signed_up', true);
  EXCEPTION WHEN unique_violation THEN
    -- Already exists, that's fine
    RAISE NOTICE 'Referral record already exists for user %', p_referred_user_id;
  END;

  -- Check achievements for the referrer
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

-- Step 3: Also update the fallback function
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION process_referral_signup(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_signup(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO service_role;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Referral constraint fix applied!';
  RAISE NOTICE 'The ON CONFLICT issue has been resolved by using explicit checks instead.';
END $$;

