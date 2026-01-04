-- ============================================
-- Quick Fix: Avatar Upload & Phone Number
-- ============================================
-- Run this in Supabase SQL Editor if you're having trouble uploading avatars.
-- This ensures the avatar_url and phone columns exist and RLS policies allow updates.

-- Enable RLS on user_profiles (in case it's not enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Ensure avatar_url column exists in user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure phone column exists in user_profiles (stores raw digits: 27721231234)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Drop ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create comprehensive RLS policies

-- Allow everyone to read profiles (for leaderboards, reviews display, etc.)
CREATE POLICY "Public profiles are viewable" ON public.user_profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT, UPDATE, INSERT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- ============================================
-- Optional: Create avatars storage bucket
-- ============================================
-- Note: Storage bucket creation must be done via the Supabase Dashboard
-- or using the Supabase CLI. The SQL below is just for reference.
--
-- Go to Storage in your Supabase Dashboard:
-- 1. Click "New bucket"
-- 2. Name it "avatars"
-- 3. Make it public (uncheck "Make private")
-- 4. Save
--
-- Then add a policy to allow authenticated users to upload:
-- - Go to Policies for the avatars bucket
-- - Add policy for INSERT: (bucket_id = 'avatars') AND (auth.role() = 'authenticated')
-- - Add policy for SELECT: true (to make files public)
-- - Add policy for UPDATE: (bucket_id = 'avatars') AND (auth.uid() = owner)
-- - Add policy for DELETE: (bucket_id = 'avatars') AND (auth.uid() = owner)

