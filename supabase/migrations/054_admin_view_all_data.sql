-- Allow admins to view all user data in the admin dashboard
-- This uses the is_admin() function created in migration 053

-- ============================================
-- ORDERS - Allow admins to view all orders
-- ============================================
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
CREATE POLICY "Admins can update all orders" ON orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- ORDER_ITEMS - Allow admins to view all order items
-- ============================================
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items" ON order_items
  FOR SELECT USING (public.is_admin());

-- ============================================
-- XP_TRANSACTIONS - Allow admins to view all XP transactions
-- ============================================
DROP POLICY IF EXISTS "Admins can view all xp transactions" ON xp_transactions;
CREATE POLICY "Admins can view all xp transactions" ON xp_transactions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert xp transactions" ON xp_transactions;
CREATE POLICY "Admins can insert xp transactions" ON xp_transactions
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================
-- USER_PROFILES - Allow admins to view/update all profiles
-- ============================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- USER_ACHIEVEMENTS - Allow admins to view all achievements
-- ============================================
DROP POLICY IF EXISTS "Admins can view all user achievements" ON user_achievements;
CREATE POLICY "Admins can view all user achievements" ON user_achievements
  FOR SELECT USING (public.is_admin());

-- ============================================
-- USER_REWARDS - Allow admins to view all rewards
-- ============================================
DROP POLICY IF EXISTS "Admins can view all user rewards" ON user_rewards;
CREATE POLICY "Admins can view all user rewards" ON user_rewards
  FOR SELECT USING (public.is_admin());

-- ============================================
-- USER_COUPONS - Allow admins to view/manage all coupons
-- ============================================
DROP POLICY IF EXISTS "Admins can view all user coupons" ON user_coupons;
CREATE POLICY "Admins can view all user coupons" ON user_coupons
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert user coupons" ON user_coupons;
CREATE POLICY "Admins can insert user coupons" ON user_coupons
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update user coupons" ON user_coupons;
CREATE POLICY "Admins can update user coupons" ON user_coupons
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete user coupons" ON user_coupons;
CREATE POLICY "Admins can delete user coupons" ON user_coupons
  FOR DELETE USING (public.is_admin());

-- ============================================
-- PRODUCT_REVIEWS - Allow admins to view/manage all reviews
-- ============================================
DROP POLICY IF EXISTS "Admins can view all reviews" ON product_reviews;
CREATE POLICY "Admins can view all reviews" ON product_reviews
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all reviews" ON product_reviews;
CREATE POLICY "Admins can update all reviews" ON product_reviews
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete all reviews" ON product_reviews;
CREATE POLICY "Admins can delete all reviews" ON product_reviews
  FOR DELETE USING (public.is_admin());

-- ============================================
-- REFERRALS - Allow admins to view all referrals
-- ============================================
DROP POLICY IF EXISTS "Admins can view all referrals" ON referrals;
CREATE POLICY "Admins can view all referrals" ON referrals
  FOR SELECT USING (public.is_admin());

-- ============================================
-- DAILY_LOGINS - Allow admins to view all login history
-- ============================================
DROP POLICY IF EXISTS "Admins can view all daily logins" ON daily_logins;
CREATE POLICY "Admins can view all daily logins" ON daily_logins
  FOR SELECT USING (public.is_admin());

-- ============================================
-- SPIN_HISTORY - Allow admins to view all spin history
-- ============================================
DROP POLICY IF EXISTS "Admins can view all spin history" ON spin_history;
CREATE POLICY "Admins can view all spin history" ON spin_history
  FOR SELECT USING (public.is_admin());

