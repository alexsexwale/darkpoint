-- ============================================
-- Migration 035: Fix auth.users UPDATE trigger (email verification sync)
-- ============================================
-- During signup, Supabase can UPDATE auth.users as part of the flow.
-- If the AFTER UPDATE trigger function references `user_profiles` without schema
-- or with a bad search_path, it can throw:
--   ERROR: relation "user_profiles" does not exist (SQLSTATE 42P01)
-- even when `public.user_profiles` exists.

-- Ensure table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0 NOT NULL,
  current_level INTEGER DEFAULT 1 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_login_date DATE,
  total_spent DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  total_orders INTEGER DEFAULT 0 NOT NULL,
  total_reviews INTEGER DEFAULT 0 NOT NULL,
  total_shares INTEGER DEFAULT 0 NOT NULL,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.user_profiles(id),
  referral_count INTEGER DEFAULT 0 NOT NULL,
  is_returning_user BOOLEAN DEFAULT FALSE,
  available_spins INTEGER DEFAULT 0 NOT NULL,
  store_credit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  newsletter_subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Replace sync function with schema-qualified update + safe exception handling
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.email_confirmed_at IS NOT NULL
       AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
      UPDATE public.user_profiles
      SET
        email_verified = TRUE,
        email_verified_at = NEW.email_confirmed_at,
        updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never abort signup/update flow
    RAISE WARNING 'sync_email_verification error for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Force trigger to use schema-qualified function
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verification();

GRANT EXECUTE ON FUNCTION public.sync_email_verification() TO service_role;


