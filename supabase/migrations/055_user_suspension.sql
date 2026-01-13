-- Add user suspension feature
-- Allows admins to suspend users and prevent login

-- Add suspension columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended ON user_profiles(is_suspended) WHERE is_suspended = true;

-- Function to check if user is suspended (for use in app)
CREATE OR REPLACE FUNCTION public.is_user_suspended(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM user_profiles WHERE id = user_uuid),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_suspended(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_suspended(uuid) TO anon;

-- Allow admins to update suspension status
DROP POLICY IF EXISTS "Admins can suspend users" ON user_profiles;
CREATE POLICY "Admins can suspend users" ON user_profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Create audit log for suspensions
CREATE TABLE IF NOT EXISTS suspension_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('suspend', 'unsuspend')),
  reason text,
  admin_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS for suspension_log
ALTER TABLE suspension_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspension log" ON suspension_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert suspension log" ON suspension_log
  FOR INSERT WITH CHECK (public.is_admin());

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_suspension_log_user ON suspension_log(user_id);
CREATE INDEX IF NOT EXISTS idx_suspension_log_created ON suspension_log(created_at DESC);

