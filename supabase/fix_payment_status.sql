-- ================================================
-- Quick Fix: Update pending orders to paid
-- Run this manually if you need to fix orders that didn't update via webhook
-- ================================================

-- First, run the enum migration (041_payment_status_enum.sql)

-- Then you can use this to manually update specific orders:

-- View all pending orders
SELECT 
  id,
  order_number,
  billing_name,
  billing_email,
  total,
  payment_status,
  status,
  yoco_checkout_id,
  yoco_payment_id,
  payment_reference,
  created_at,
  paid_at
FROM orders 
WHERE payment_status = 'pending'
ORDER BY created_at DESC;

-- To mark a specific order as paid, use:
-- UPDATE orders 
-- SET payment_status = 'paid', status = 'processing', paid_at = NOW(), updated_at = NOW()
-- WHERE order_number = 'YOUR_ORDER_NUMBER';

-- Or to mark all recent pending orders as paid (use with caution):
-- UPDATE orders 
-- SET payment_status = 'paid', status = 'processing', paid_at = NOW(), updated_at = NOW()
-- WHERE payment_status = 'pending' 
-- AND created_at > NOW() - INTERVAL '1 day';

-- To test the webhook manually, you can also visit:
-- https://darkpoint.co.za/api/checkout/yoco/webhook?order=YOUR_ORDER_NUMBER
-- To mark it paid via debug endpoint:
-- https://darkpoint.co.za/api/checkout/yoco/webhook?order=YOUR_ORDER_NUMBER&markPaid=true

