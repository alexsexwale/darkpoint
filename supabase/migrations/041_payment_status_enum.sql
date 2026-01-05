-- ================================================
-- Migration: 041_payment_status_enum.sql
-- Description: Convert payment_status to enum and fix update issues
-- ================================================

-- Step 1: Create the enum type
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Remove existing CHECK constraint if exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Step 3: Drop the default before converting type
ALTER TABLE orders ALTER COLUMN payment_status DROP DEFAULT;

-- Step 4: Ensure all existing values are valid
UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL OR payment_status NOT IN ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- Step 5: Alter the column type using explicit cast
ALTER TABLE orders 
  ALTER COLUMN payment_status TYPE payment_status_enum 
  USING payment_status::payment_status_enum;

-- Step 6: Re-add the default with proper type
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'pending'::payment_status_enum;

-- Step 7: Create a function to update order payment status that bypasses any RLS issues
CREATE OR REPLACE FUNCTION update_order_payment_status(
  p_order_id UUID,
  p_payment_status TEXT,
  p_yoco_payment_id TEXT DEFAULT NULL,
  p_yoco_checkout_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_order_number TEXT;
BEGIN
  -- Update the order
  UPDATE orders
  SET 
    payment_status = p_payment_status::payment_status_enum,
    status = CASE WHEN p_payment_status = 'paid' THEN 'processing' ELSE status END,
    paid_at = CASE WHEN p_payment_status = 'paid' THEN NOW() ELSE paid_at END,
    yoco_payment_id = COALESCE(p_yoco_payment_id, yoco_payment_id),
    yoco_checkout_id = COALESCE(p_yoco_checkout_id, yoco_checkout_id),
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING order_number INTO v_order_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'order_number', v_order_number,
    'payment_status', p_payment_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to find order by various identifiers
CREATE OR REPLACE FUNCTION find_order_for_payment(
  p_order_id UUID DEFAULT NULL,
  p_order_number TEXT DEFAULT NULL,
  p_yoco_checkout_id TEXT DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Try each lookup method in order of preference
  IF p_order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'order', row_to_json(v_order)
      );
    END IF;
  END IF;
  
  IF p_order_number IS NOT NULL THEN
    SELECT * INTO v_order FROM orders WHERE order_number = p_order_number;
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'order', row_to_json(v_order)
      );
    END IF;
  END IF;
  
  IF p_yoco_checkout_id IS NOT NULL THEN
    SELECT * INTO v_order FROM orders WHERE yoco_checkout_id = p_yoco_checkout_id;
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'order', row_to_json(v_order)
      );
    END IF;
  END IF;
  
  IF p_payment_reference IS NOT NULL THEN
    SELECT * INTO v_order FROM orders WHERE payment_reference = p_payment_reference;
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'order', row_to_json(v_order)
      );
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', false,
    'error', 'Order not found',
    'searched', json_build_object(
      'order_id', p_order_id,
      'order_number', p_order_number,
      'yoco_checkout_id', p_yoco_checkout_id,
      'payment_reference', p_payment_reference
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_order_payment_status(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_order_payment_status(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_payment_status(UUID, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION find_order_for_payment(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION find_order_for_payment(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_order_for_payment(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Step 9: Update RLS policies to allow service role updates
DROP POLICY IF EXISTS "Service role can update orders" ON orders;
CREATE POLICY "Service role can update orders" ON orders
  FOR UPDATE USING (true);

-- Step 10: Add index on yoco_payment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_yoco_payment_id ON orders(yoco_payment_id);

-- Verify the changes
DO $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT data_type INTO v_type 
  FROM information_schema.columns 
  WHERE table_name = 'orders' AND column_name = 'payment_status';
  
  RAISE NOTICE 'payment_status column type is now: %', v_type;
END $$;
