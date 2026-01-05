-- ============================================
-- MIGRATION 009: Welcome Bonus & Newsletter
-- ============================================
-- Gives new users 100 XP, 1 free spin, auto newsletter subscription, and 10% off coupon

-- ============================================
-- TABLE: Newsletter Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_subscribed BOOLEAN NOT NULL DEFAULT true,
  source TEXT DEFAULT 'website', -- 'website', 'registration', 'checkout'
  subscribed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists)
DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON newsletter_subscriptions;

CREATE POLICY "Anyone can subscribe" ON newsletter_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own subscription" ON newsletter_subscriptions
  FOR SELECT USING (auth.uid() = user_id OR email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Users can update own subscription" ON newsletter_subscriptions
  FOR UPDATE USING (auth.uid() = user_id OR email = current_setting('request.jwt.claims', true)::json->>'email');

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);

-- ============================================
-- TABLE: User Coupons (for welcome 10% off)
-- ============================================
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed'
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2),
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  source TEXT DEFAULT 'welcome', -- 'welcome', 'spin', 'achievement', 'referral'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exists from previous migration)
DROP POLICY IF EXISTS "Users can view own coupons" ON user_coupons;
CREATE POLICY "Users can view own coupons" ON user_coupons
  FOR SELECT USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_code ON user_coupons(code);

-- ============================================
-- FUNCTION: Generate Unique Coupon Code
-- ============================================
CREATE OR REPLACE FUNCTION generate_coupon_code(p_prefix TEXT DEFAULT 'DP')
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random alphanumeric code
    v_code := p_prefix || '-' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM user_coupons WHERE code = v_code) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Create Welcome Bonus for New User
-- ============================================
CREATE OR REPLACE FUNCTION create_welcome_bonus(p_user_id UUID, p_email TEXT)
RETURNS JSON AS $$
DECLARE
  v_coupon_code TEXT;
  v_profile user_profiles%ROWTYPE;
BEGIN
  -- Get or create user profile
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    -- Profile should be created by signup trigger, but just in case
    INSERT INTO user_profiles (id, total_xp, current_level, available_spins)
    VALUES (p_user_id, 100, 1, 1)
    ON CONFLICT (id) DO UPDATE SET
      total_xp = user_profiles.total_xp + 100,
      available_spins = user_profiles.available_spins + 1;
  ELSE
    -- Add welcome bonus to existing profile
    UPDATE user_profiles SET
      total_xp = total_xp + 100,
      available_spins = available_spins + 1,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  -- Log the XP transaction
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (p_user_id, 100, 'welcome', 'Welcome bonus for joining Darkpoint!')
  ON CONFLICT DO NOTHING;
  
  -- Subscribe to newsletter
  INSERT INTO newsletter_subscriptions (email, user_id, source)
  VALUES (p_email, p_user_id, 'registration')
  ON CONFLICT (email) DO UPDATE SET
    user_id = p_user_id,
    is_subscribed = true,
    source = 'registration',
    updated_at = NOW();
  
  -- Generate welcome coupon (10% off, expires in 30 days)
  v_coupon_code := generate_coupon_code('WELCOME');
  
  INSERT INTO user_coupons (user_id, code, discount_type, discount_value, expires_at, source)
  VALUES (
    p_user_id, 
    v_coupon_code, 
    'percentage', 
    10, 
    NOW() + INTERVAL '30 days',
    'welcome'
  );
  
  RETURN json_build_object(
    'success', true,
    'xp_bonus', 100,
    'free_spins', 1,
    'coupon_code', v_coupon_code,
    'coupon_discount', 10
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE: Handle New User Trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Extract username from metadata
  v_username := NEW.raw_user_meta_data->>'username';
  
  -- Create user profile with welcome bonus (100 XP + 1 free spin)
  INSERT INTO user_profiles (
    id, 
    username, 
    display_name, 
    email,
    total_xp,
    current_level,
    available_spins
  )
  VALUES (
    NEW.id, 
    v_username, 
    COALESCE(v_username, split_part(NEW.email, '@', 1)),
    NEW.email,
    100,  -- Welcome bonus XP
    1,
    1     -- Free welcome spin
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    username = COALESCE(v_username, user_profiles.username),
    total_xp = user_profiles.total_xp + 100,
    available_spins = user_profiles.available_spins + 1,
    updated_at = NOW();
  
  -- Log the welcome XP
  INSERT INTO xp_transactions (user_id, amount, action, description)
  VALUES (NEW.id, 100, 'welcome', '🎮 Welcome to Darkpoint! Here''s 100 XP to start your journey!')
  ON CONFLICT DO NOTHING;
  
  -- Auto-subscribe to newsletter
  INSERT INTO newsletter_subscriptions (email, user_id, source)
  VALUES (NEW.email, NEW.id, 'registration')
  ON CONFLICT (email) DO UPDATE SET
    user_id = NEW.id,
    is_subscribed = true,
    source = 'registration',
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Subscribe to Newsletter
-- ============================================
CREATE OR REPLACE FUNCTION subscribe_newsletter(p_email TEXT, p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_is_new BOOLEAN := false;
BEGIN
  INSERT INTO newsletter_subscriptions (email, user_id, source)
  VALUES (lower(trim(p_email)), p_user_id, 'website')
  ON CONFLICT (email) DO UPDATE SET
    is_subscribed = true,
    user_id = COALESCE(p_user_id, newsletter_subscriptions.user_id),
    updated_at = NOW()
  RETURNING (xmax = 0) INTO v_is_new;
  
  RETURN json_build_object(
    'success', true,
    'is_new', v_is_new,
    'email', lower(trim(p_email))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get User's Available Coupons
-- ============================================
CREATE OR REPLACE FUNCTION get_user_coupons(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', id,
      'code', code,
      'discount_type', discount_type,
      'discount_value', discount_value,
      'min_order_amount', min_order_amount,
      'expires_at', expires_at,
      'source', source,
      'is_active', is_active AND (expires_at IS NULL OR expires_at > NOW()) AND used_count < max_uses
    ) ORDER BY created_at DESC), '[]'::json)
    FROM user_coupons
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
