-- Fix RLS policy for admin_users table
-- The previous policy had a circular dependency: it checked if user is in admin_users by querying admin_users
-- This fix allows users to view their own record, breaking the circular dependency

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;

-- Drop the new policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Users can view their own admin record" ON admin_users;

-- New policy: Users can view their own admin record
-- This allows the login flow to check if a user is an admin by querying their own row
CREATE POLICY "Users can view their own admin record" ON admin_users
  FOR SELECT USING (auth.uid() = id);

-- For viewing all admin users (admin management pages), we'll use a security definer function
-- or handle it through API routes with service role. For now, admins can view all via their own record check.
-- Note: This means admin management pages that list all admins will need to use service role or a function.

