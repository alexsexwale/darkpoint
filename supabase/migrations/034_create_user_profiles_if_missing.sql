-- ============================================
-- Migration 034: Create user_profiles if missing (fixes signup 500)
-- ============================================
-- Root cause seen in Supabase Auth logs:
--   ERROR: relation "user_profiles" does not exist (SQLSTATE 42P01)
-- This happens when the auth.users trigger runs but the base tables were never created.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,

  -- XP & Leveling
  total_xp INTEGER DEFAULT 0 NOT NULL,
  current_level INTEGER DEFAULT 1 NOT NULL,

  -- Streaks
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_login_date DATE,

  -- Stats
  total_spent DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  total_orders INTEGER DEFAULT 0 NOT NULL,
  total_reviews INTEGER DEFAULT 0 NOT NULL,
  total_shares INTEGER DEFAULT 0 NOT NULL,

  -- Referral
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.user_profiles(id),
  referral_count INTEGER DEFAULT 0 NOT NULL,
  is_returning_user BOOLEAN DEFAULT FALSE,

  -- Rewards
  available_spins INTEGER DEFAULT 0 NOT NULL,
  store_credit DECIMAL(10, 2) DEFAULT 0 NOT NULL,

  -- Email verification tracking
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  newsletter_subscribed BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


