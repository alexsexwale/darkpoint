-- Fix RLS policies for all admin dashboard tables
-- The policies were querying admin_users inside their USING clause, causing recursion errors
-- This migration uses a SECURITY DEFINER function to safely check admin status

-- ============================================
-- HELPER FUNCTION (if not already created)
-- ============================================

-- Check if current user is an admin (any role)
CREATE OR REPLACE FUNCTION public.is_admin()
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
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- FIX admin_products RLS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view active products" ON admin_products;
DROP POLICY IF EXISTS "Admins can view all products" ON admin_products;
DROP POLICY IF EXISTS "Admins can manage products" ON admin_products;

-- Anyone can view active products (for main site)
CREATE POLICY "Anyone can view active products" ON admin_products
  FOR SELECT USING (is_active = true);

-- Admins can view all products (uses helper function to avoid recursion)
CREATE POLICY "Admins can view all products" ON admin_products
  FOR SELECT USING (public.is_admin());

-- Admins can insert products
CREATE POLICY "Admins can insert products" ON admin_products
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update products
CREATE POLICY "Admins can update products" ON admin_products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admins can delete products
CREATE POLICY "Admins can delete products" ON admin_products
  FOR DELETE USING (public.is_admin());

-- ============================================
-- FIX cj_orders RLS
-- ============================================

DROP POLICY IF EXISTS "Admins can manage CJ orders" ON cj_orders;

CREATE POLICY "Admins can select CJ orders" ON cj_orders
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert CJ orders" ON cj_orders
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update CJ orders" ON cj_orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete CJ orders" ON cj_orders
  FOR DELETE USING (public.is_admin());

-- ============================================
-- FIX store_settings RLS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view store settings" ON store_settings;
DROP POLICY IF EXISTS "Admins can manage store settings" ON store_settings;

-- Anyone can view store settings (needed for main site)
CREATE POLICY "Anyone can view store settings" ON store_settings
  FOR SELECT USING (true);

-- Admins can manage store settings
CREATE POLICY "Admins can insert store settings" ON store_settings
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update store settings" ON store_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete store settings" ON store_settings
  FOR DELETE USING (public.is_admin());

-- ============================================
-- FIX admin_activity_log RLS
-- ============================================

DROP POLICY IF EXISTS "Admins can view activity log" ON admin_activity_log;
DROP POLICY IF EXISTS "Admins can insert activity log" ON admin_activity_log;

CREATE POLICY "Admins can view activity log" ON admin_activity_log
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert activity log" ON admin_activity_log
  FOR INSERT WITH CHECK (public.is_admin());

