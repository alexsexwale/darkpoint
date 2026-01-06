-- ================================================
-- FIX: Welcome Reward for New Users
-- Ensures new users receive their 10% off coupon
-- ================================================

-- Step 0: Create deleted_accounts table if not exists
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON deleted_accounts(email);

-- Step 1: Add description column to user_coupons if missing
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;
ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- Step 2: Update handle_new_user trigger to properly create welcome reward
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
  
  -- Check if this is a returning user (email exists in deleted_accounts)
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
  
  -- Create user profile
  INSERT INTO user_profiles (
    id,
    username,
    display_name,
    email,
    referral_code,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    total_spent,
    total_orders,
    total_reviews,
    total_referrals,
    available_spins,
    newsletter_subscribed,
    is_returning_user
  ) VALUES (
    NEW.id,
    v_username,
    v_display_name,
    NEW.email,
    v_referral_code,
    v_welcome_xp,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    v_welcome_spins,
    TRUE,
    v_is_returning
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(user_profiles.username, EXCLUDED.username);
  
  -- For new users only: Give welcome bonuses
  IF NOT v_is_returning THEN
    -- Log welcome XP
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (NEW.id, v_welcome_xp, 'signup', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!')
    ON CONFLICT DO NOTHING;
    
    -- Create welcome discount reward (10% off, expires in 30 days)
    INSERT INTO user_coupons (
      user_id,
      code,
      discount_type,
      discount_value,
      min_order_value,
      max_uses,
      uses_count,
      is_used,
      source,
      description,
      expires_at
    ) VALUES (
      NEW.id,
      NULL,  -- No code needed - selectable in cart/checkout
      'percent',
      10,
      0,
      1,
      0,
      FALSE,
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
    BEGIN
      PERFORM process_referral_signup(NEW.id, v_ref_code_used);
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail signup if referral processing fails
      RAISE WARNING 'Referral processing failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail user creation
    RAISE WARNING 'handle_new_user warning for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Create function to manually grant welcome reward (for existing users who didn't get it)
CREATE OR REPLACE FUNCTION grant_welcome_reward(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if user already has a welcome reward
  SELECT EXISTS(
    SELECT 1 FROM user_coupons 
    WHERE user_id = p_user_id AND source = 'welcome'
  ) INTO v_exists;
  
  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has welcome reward');
  END IF;
  
  -- Create the welcome reward
  INSERT INTO user_coupons (
    user_id,
    code,
    discount_type,
    discount_value,
    min_order_value,
    max_uses,
    uses_count,
    is_used,
    source,
    description,
    expires_at
  ) VALUES (
    p_user_id,
    NULL,
    'percent',
    10,
    0,
    1,
    0,
    FALSE,
    'welcome',
    '🎁 Welcome Gift: 10% Off Your First Order',
    NOW() + INTERVAL '30 days'
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Welcome reward granted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION grant_welcome_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_welcome_reward(UUID) TO service_role;

-- Step 5: Grant welcome reward to current user who doesn't have one
-- Run this to fix existing users:
-- SELECT grant_welcome_reward('YOUR-USER-UUID');

SELECT 'Welcome reward system fixed! New users will now receive 10% off coupon.' as status;

