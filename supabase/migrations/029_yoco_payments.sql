-- ================================================
-- Migration: 029_yoco_payments.sql
-- Description: Add Yoco payment integration fields to orders table
-- ================================================

-- Add payment-related columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS yoco_payment_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_email TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS applied_reward_id UUID DEFAULT NULL REFERENCES user_coupons(id) ON DELETE SET NULL;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_yoco_checkout_id ON orders(yoco_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Function to update user order stats after successful payment
CREATE OR REPLACE FUNCTION update_user_order_stats(p_user_id UUID, p_order_total NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET 
    total_orders = COALESCE(total_orders, 0) + 1,
    total_spent = COALESCE(total_spent, 0) + p_order_total,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant bonus spin for big spenders
CREATE OR REPLACE FUNCTION grant_bonus_spin(p_user_id UUID, p_reason TEXT DEFAULT 'Bonus spin')
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET 
    available_spins = COALESCE(available_spins, 0) + 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the bonus spin
  INSERT INTO xp_transactions (user_id, action, amount, description, created_at)
  VALUES (p_user_id, 'bonus_spin', 0, p_reason, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_order_stats(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_order_stats(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION grant_bonus_spin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_bonus_spin(UUID, TEXT) TO service_role;

-- RLS Policy updates for orders
-- Allow users to view their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert orders (for checkout)
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role can do anything
DROP POLICY IF EXISTS "Service role full access to orders" ON orders;
CREATE POLICY "Service role full access to orders" ON orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Guest orders (no user_id) - allow viewing by order number via API
DROP POLICY IF EXISTS "Public can view guest orders" ON orders;
CREATE POLICY "Public can view guest orders" ON orders
  FOR SELECT USING (user_id IS NULL);

-- RLS for order_items
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Service role full access to order_items" ON order_items;
CREATE POLICY "Service role full access to order_items" ON order_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Comment on new columns
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, paid, failed, refunded, cancelled';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used (e.g., yoco, eft)';
COMMENT ON COLUMN orders.payment_reference IS 'Internal transaction reference';
COMMENT ON COLUMN orders.yoco_checkout_id IS 'Yoco checkout session ID';
COMMENT ON COLUMN orders.yoco_payment_id IS 'Yoco payment ID after successful payment';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN orders.applied_reward_id IS 'Reference to applied user coupon/reward';

