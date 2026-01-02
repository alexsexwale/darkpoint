-- ============================================
-- Migration 033: Fix signup trigger so registration can never hard-fail
-- ============================================
-- Problem:
-- - Some environments may have `on_auth_user_created` pointing to `handle_new_user_v2()`
-- - `handle_new_user_v2()` (from 031_fix_welcome_reward.sql) has NO exception handling,
--   so any insert error can abort auth signup and Supabase returns:
--   "Database error saving new user" (500).
--
-- Fix:
-- 1) Ensure required columns exist (idempotent).
-- 2) Create/replace a robust `handle_new_user()` that NEVER raises.
-- 3) Make `handle_new_user_v2()` a SAFE wrapper around `handle_new_user()` so even if
--    a trigger still points to v2, signup won't fail.
-- 4) Recreate the trigger to point to `handle_new_user()` explicitly.

-- ============================================
-- 1) Ensure required columns exist
-- ============================================
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_returning_user BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_shares INTEGER DEFAULT 0;

ALTER TABLE public.user_coupons ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- 2) Robust handle_new_user(): never abort auth insert
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_referral_code TEXT;
  v_is_returning BOOLEAN := FALSE;
BEGIN
  -- Defensive: deleted_accounts may not exist in all environments
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.deleted_accounts WHERE LOWER(email) = LOWER(NEW.email)
    ) INTO v_is_returning;
  EXCEPTION WHEN undefined_table THEN
    v_is_returning := FALSE;
  END;

  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_username := LOWER(REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_]', '', 'g'));
  IF LENGTH(v_username) < 3 THEN
    v_username := 'user_' || LEFT(NEW.id::TEXT, 8);
  END IF;

  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), '')
  );

  -- Referral code: best-effort uniqueness
  v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 6)) || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  FOR i IN 1..10 LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE referral_code = v_referral_code);
    v_referral_code := 'DARK-' || UPPER(LEFT(v_username, 4)) || FLOOR(RANDOM() * 90000 + 10000)::TEXT;
  END LOOP;

  -- Create/update profile (never raise)
  BEGIN
    INSERT INTO public.user_profiles (
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
      referral_count,
      available_spins,
      newsletter_subscribed,
      is_returning_user,
      email_verified,
      email_verified_at
    ) VALUES (
      NEW.id,
      v_username,
      v_display_name,
      NEW.email,
      v_referral_code,
      CASE WHEN v_is_returning THEN 0 ELSE 100 END,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      CASE WHEN v_is_returning THEN 0 ELSE 1 END,
      TRUE,
      v_is_returning,
      (NEW.email_confirmed_at IS NOT NULL),
      NEW.email_confirmed_at
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_verified = EXCLUDED.email_verified,
      email_verified_at = EXCLUDED.email_verified_at,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- XP transaction (non-critical)
  BEGIN
    INSERT INTO public.xp_transactions (user_id, amount, action, description)
    VALUES (NEW.id, 100, 'signup', '🎮 Welcome to Dark Point!')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Newsletter subscription (non-critical)
  BEGIN
    INSERT INTO public.newsletter_subscriptions (email, user_id, source)
    VALUES (NEW.email, NEW.id, 'registration')
    ON CONFLICT (email) DO UPDATE SET
      user_id = NEW.id,
      is_subscribed = true,
      source = 'registration',
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Absolute last line of defense
  RAISE WARNING 'handle_new_user unexpected error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- 3) Make handle_new_user_v2() safe (wrapper)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.handle_new_user();
  EXCEPTION WHEN OTHERS THEN
    -- Never abort signup if v2 is used anywhere
    RAISE WARNING 'handle_new_user_v2 wrapper error for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- ============================================
-- 4) Force trigger to use handle_new_user()
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_v2() TO service_role;


