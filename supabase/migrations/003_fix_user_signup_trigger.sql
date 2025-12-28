-- Migration: Fix User Signup Trigger
-- This fixes the handle_new_user() function to handle edge cases and errors properly
-- Run this in Supabase SQL Editor if you're getting "Database error saving new user"

-- First, let's check if the trigger exists and drop it if needed
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function to recreate it
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with better error handling and proper type casting
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ref_code VARCHAR(20);
  username_val VARCHAR(30);
  display_name_val VARCHAR(50);
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Extract username, ensuring it fits the VARCHAR(30) constraint
  username_val := LEFT(COALESCE(NEW.raw_user_meta_data->>'username', LEFT(NEW.email, 6)), 30);
  
  -- Extract display name, ensuring it fits the VARCHAR(50) constraint
  display_name_val := LEFT(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    LEFT(NEW.email, 6)
  ), 50);
  
  -- Generate referral code with retry logic to handle uniqueness conflicts
  LOOP
    ref_code := generate_referral_code(username_val);
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE referral_code = ref_code) THEN
      EXIT; -- Code is unique, exit loop
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      -- Fallback: use UUID-based code if we can't generate a unique one
      ref_code := 'DARK-' || UPPER(LEFT(REPLACE(NEW.id::TEXT, '-', ''), 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
      EXIT;
    END IF;
  END LOOP;
  
  -- Create user profile with error handling
  BEGIN
    INSERT INTO user_profiles (id, username, display_name, referral_code, total_xp)
    VALUES (
      NEW.id,
      username_val,
      display_name_val,
      ref_code,
      100 -- Signup bonus XP
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- If username or referral_code conflict, try with modified values
      INSERT INTO user_profiles (id, username, display_name, referral_code, total_xp)
      VALUES (
        NEW.id,
        COALESCE(username_val, LEFT(NEW.email, 6)) || '_' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 4),
        display_name_val,
        ref_code || '_' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 4),
        100
      );
    WHEN OTHERS THEN
      -- Log the error but don't fail the signup
      RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
      -- Still create a minimal profile
      INSERT INTO user_profiles (id, username, display_name, referral_code, total_xp)
      VALUES (
        NEW.id,
        LEFT(NEW.email, 6),
        LEFT(NEW.email, 6),
        'DARK-' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 10),
        100
      );
  END;
  
  -- Log XP transaction with error handling
  BEGIN
    INSERT INTO xp_transactions (user_id, amount, action, description)
    VALUES (NEW.id, 100, 'signup'::xp_action, 'Welcome bonus XP');
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the signup
      RAISE WARNING 'Error logging XP transaction for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure the function has the right permissions (SECURITY DEFINER allows it to bypass RLS)
ALTER FUNCTION handle_new_user() SECURITY DEFINER;

-- Grant necessary permissions to the function
-- Note: SECURITY DEFINER functions run with the privileges of the function owner (usually postgres)
-- So they should already have the necessary permissions

-- Verify the function exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE EXCEPTION 'Function handle_new_user() was not created successfully';
  END IF;
END $$;
