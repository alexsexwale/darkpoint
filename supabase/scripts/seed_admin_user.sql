-- ============================================
-- Seed first admin user (run once when admin_users is empty)
-- ============================================
-- Prerequisites:
-- 1. Create the user in Supabase Dashboard: Authentication → Users → Add user (email + password).
-- 2. Copy the user's UUID from that user's row (or from auth.users in SQL).
--
-- Then run this in Supabase SQL Editor, replacing the placeholders:
--   - YOUR_AUTH_USER_UUID: the UUID from step 1
--   - your-admin@example.com: the same email as the Auth user

INSERT INTO public.admin_users (id, email, role)
VALUES (
  '3f8397e6-633d-4171-9cc3-449d78a063d6'::uuid,
  'support@darkpoint.co.za',
  'super_admin'
)
ON CONFLICT (id) DO NOTHING;
