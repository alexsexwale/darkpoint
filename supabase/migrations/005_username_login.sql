-- Migration 005: Enable username-based login
-- This creates a secure function to look up a user's email by their profile ID

-- Create a function that can be called via RPC to get user email
-- This is SECURITY DEFINER so it runs with elevated privileges
CREATE OR REPLACE FUNCTION get_user_email_by_id(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only allow authenticated users to call this function
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anon users (for login)
GRANT EXECUTE ON FUNCTION get_user_email_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email_by_id(UUID) TO anon;

-- Alternative simpler approach: Store email in user_profiles table
-- This avoids the need to query auth.users directly

-- Add email column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- Update handle_new_user to also save email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  username_val TEXT;
  display_name_val TEXT;
BEGIN
  -- Extract username (max 30 chars)
  username_val := LOWER(LEFT(COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  ), 30));
  
  -- Extract display name (max 50 chars)
  display_name_val := LEFT(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  ), 50);
  
  -- Generate referral code
  ref_code := 'DARK-' || UPPER(LEFT(username_val, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  
  -- Insert into user_profiles
  INSERT INTO public.user_profiles (
    id, 
    email,
    username, 
    display_name, 
    referral_code, 
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    total_spent,
    total_orders,
    total_reviews,
    referral_count,
    available_spins,
    store_credit
  )
  VALUES (
    NEW.id,
    NEW.email,  -- Store email for username lookup
    username_val,
    display_name_val,
    ref_code,
    100,  -- Signup bonus XP
    1,    -- Starting level
    0,    -- Current streak
    0,    -- Longest streak
    0,    -- Total spent
    0,    -- Total orders
    0,    -- Total reviews
    0,    -- Referral count
    1,    -- Starting spin (welcome bonus)
    0     -- Store credit
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(user_profiles.username, EXCLUDED.username);
  
  -- Log XP transaction (only if xp_transactions table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_transactions') THEN
    BEGIN
      INSERT INTO public.xp_transactions (user_id, amount, action, description)
      VALUES (NEW.id, 100, 'signup', 'Welcome bonus XP');
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore XP logging errors
      NULL;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Create a simpler lookup function that uses the email stored in user_profiles
CREATE OR REPLACE FUNCTION get_email_by_username(lookup_username TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM user_profiles
  WHERE username = LOWER(lookup_username);
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO anon;

-- Allow public read access to username column for login lookup
CREATE POLICY "Anyone can check if username exists" ON user_profiles
  FOR SELECT USING (true);

