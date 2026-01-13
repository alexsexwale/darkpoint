-- Fix RLS recursion on admin_users
-- Problem: policies on admin_users referenced admin_users (directly), causing Postgres recursion (SQLSTATE 42P17)
-- Symptom: GET /rest/v1/admin_users ... returns 500 with PostgREST error=42P17
--
-- Strategy:
-- 1) Drop any recursive policies on admin_users
-- 2) Allow users to SELECT their own row (needed for login check)
-- 3) Allow super_admin to manage admin_users via a SECURITY DEFINER function (avoids RLS recursion)

-- Ensure table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_users'
  ) THEN
    RAISE EXCEPTION 'public.admin_users does not exist. Run 050_admin_dashboard_tables.sql first.';
  END IF;
END $$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop legacy / recursive policies (names from earlier iterations)
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view their own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;

-- SECURITY DEFINER helper to check super admin without RLS recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.id = auth.uid()
      AND au.role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Minimal SELECT policy: allow the logged-in user to read their own admin_users row.
-- This is what the admin dashboard login flow needs.
CREATE POLICY "admin_users_select_self" ON public.admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- Optional: allow super_admins to manage admin_users rows (insert/update/delete) without recursion.
CREATE POLICY "admin_users_insert_super_admin" ON public.admin_users
  FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "admin_users_update_super_admin" ON public.admin_users
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "admin_users_delete_super_admin" ON public.admin_users
  FOR DELETE
  USING (public.is_super_admin());


