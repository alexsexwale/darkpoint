-- Migration 004: Simple User Trigger
-- This is a simplified version that doesn't rely on enums or other functions
-- Run this if the previous migrations failed

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS generate_referral_code(TEXT);

-- Create a simple referral code generator
CREATE OR REPLACE FUNCTION generate_referral_code(username TEXT)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'DARK-' || UPPER(LEFT(COALESCE(username, 'USER'), 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Check if xp_action enum exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xp_action') THEN
    CREATE TYPE xp_action AS ENUM (
      'signup', 'daily_login', 'first_purchase', 'purchase', 
      'review', 'photo_review', 'share', 'referral', 
      'quest', 'achievement', 'spin_reward', 'bonus', 'admin'
    );
  END IF;
END $$;

-- Create the simplified handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  username_val TEXT;
  display_name_val TEXT;
BEGIN
  -- Extract username (max 30 chars)
  username_val := LEFT(COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  ), 30);
  
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
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate errors
  
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION generate_referral_code(TEXT) TO service_role;

-- Verify everything is set up
SELECT 'Trigger created successfully' AS status 
WHERE EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created');

