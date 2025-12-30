-- ============================================
-- MIGRATION 011: Referral System with XP Rewards
-- ============================================
-- This migration updates the signup trigger to handle referrals
-- and awards XP instead of store credit

-- ============================================
-- FUNCTION: Process Referral
-- Awards XP to both referrer and referred user
-- ============================================
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_profile user_profiles%ROWTYPE;
  v_referral_xp INTEGER := 300; -- XP for referrer
  v_referred_xp INTEGER := 200; -- Extra XP for referred user
BEGIN
  -- Find the referrer by code
  SELECT id INTO v_referrer_id
  FROM user_profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Make sure user isn't referring themselves
  IF v_referrer_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if user was already referred
  SELECT * INTO v_referrer_profile
  FROM user_profiles
  WHERE id = p_referred_user_id;

  IF v_referrer_profile.referred_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User already has a referrer');
  END IF;

  -- Update referred user's profile
  UPDATE user_profiles SET
    referred_by = v_referrer_id,
    total_xp = total_xp + v_referred_xp,
    updated_at = NOW()
  WHERE id = p_referred_user_id;

  -- Update referrer's profile (increment count and add XP)
  UPDATE user_profiles SET
    referral_count = referral_count + 1,
    total_xp = total_xp + v_referral_xp,
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- Log XP transactions
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES 
    (v_referrer_id, v_referral_xp, 'referral', 'Referral bonus for new user signup'),
    (p_referred_user_id, v_referred_xp, 'referral', 'Referral signup bonus');

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status, reward_claimed)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code, 'signed_up', true)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_xp', v_referral_xp,
    'referred_xp', v_referred_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATED FUNCTION: Handle New User (with referral support)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username TEXT;
  v_referral_code TEXT;
  v_full_name TEXT;
  v_ref_code TEXT;
  v_welcome_coupon_code TEXT;
BEGIN
  -- Extract data from metadata
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CONCAT(
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
  );
  
  -- Get referral code from signup metadata
  v_ref_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- Generate unique referral code for this user
  v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  
  -- Ensure referral code is unique
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = v_referral_code) LOOP
    v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;
  
  -- Generate welcome coupon code
  v_welcome_coupon_code := 'WELCOME-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 8));

  -- Create user profile with welcome bonuses
  INSERT INTO public.user_profiles (
    id,
    username,
    display_name,
    referral_code,
    total_xp,
    current_level,
    available_spins,
    current_streak,
    longest_streak,
    total_spent,
    total_orders,
    total_reviews,
    referral_count
  ) VALUES (
    NEW.id,
    v_username,
    NULLIF(TRIM(v_full_name), ''),
    v_referral_code,
    100,  -- Welcome bonus XP
    1,
    1,    -- Welcome bonus free spin
    0,
    0,
    0,
    0,
    0,
    0
  );

  -- Create welcome coupon
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
    v_welcome_coupon_code,
    'percent',
    10,
    0,
    1,
    0,
    'welcome',
    NOW() + INTERVAL '30 days'
  );

  -- Log welcome XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (NEW.id, 100, 'signup', 'Welcome bonus XP');

  -- Subscribe to newsletter
  INSERT INTO newsletter_subscribers (email, source, subscribed_at)
  VALUES (NEW.email, 'signup', NOW())
  ON CONFLICT (email) DO UPDATE SET
    source = 'signup',
    is_active = true,
    subscribed_at = NOW();

  -- Process referral if code provided
  IF v_ref_code IS NOT NULL AND v_ref_code != '' THEN
    PERFORM process_referral(NEW.id, v_ref_code);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle username conflicts by appending random number
    v_username := v_username || FLOOR(RANDOM() * 1000)::TEXT;
    v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
    
    INSERT INTO public.user_profiles (
      id, username, display_name, referral_code, total_xp, current_level, 
      available_spins, current_streak, longest_streak, total_spent, 
      total_orders, total_reviews, referral_count
    ) VALUES (
      NEW.id, v_username, NULLIF(TRIM(v_full_name), ''), v_referral_code, 
      100, 1, 1, 0, 0, 0, 0, 0, 0
    );
    
    -- Process referral for retry case too
    IF v_ref_code IS NOT NULL AND v_ref_code != '' THEN
      PERFORM process_referral(NEW.id, v_ref_code);
    END IF;
    
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Referral Stats
-- ============================================
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_referrals JSON;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT json_agg(json_build_object(
    'id', r.id,
    'referred_name', COALESCE(u.display_name, u.username, 'Anonymous'),
    'status', r.status,
    'created_at', r.created_at
  ))
  INTO v_referrals
  FROM referrals r
  LEFT JOIN user_profiles u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;

  RETURN json_build_object(
    'success', true,
    'referral_code', v_profile.referral_code,
    'referral_count', v_profile.referral_count,
    'referrals', COALESCE(v_referrals, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION process_referral(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;

