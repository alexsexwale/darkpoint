-- ============================================
-- ADMIN NOTIFICATIONS TABLE
-- Real-time notification system for admin dashboard
-- ============================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'customer', 'inventory', 'system')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  icon VARCHAR(50), -- icon name for UI rendering
  link VARCHAR(255), -- URL to navigate on click
  data JSONB DEFAULT '{}', -- additional metadata (order_id, customer_id, etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries (unread first, newest first)
CREATE INDEX IF NOT EXISTS idx_notifications_read_created ON admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON admin_notifications(type);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can manage notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON admin_notifications;

-- Policy for admins to view all notifications
CREATE POLICY "Admins can view notifications" ON admin_notifications
  FOR SELECT USING (is_admin());

-- Policy for admins to update notifications (mark as read)
CREATE POLICY "Admins can update notifications" ON admin_notifications
  FOR UPDATE USING (is_admin());

-- Policy for service role to insert notifications (from API routes)
CREATE POLICY "Service role can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- Policy for admins to delete notifications
CREATE POLICY "Admins can delete notifications" ON admin_notifications
  FOR DELETE USING (is_admin());

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- Add helpful comments
COMMENT ON TABLE admin_notifications IS 'Stores admin dashboard notifications for orders, customers, inventory, and system events';
COMMENT ON COLUMN admin_notifications.type IS 'Notification category: order, customer, inventory, or system';
COMMENT ON COLUMN admin_notifications.icon IS 'Icon name to display (e.g., HiOutlineShoppingCart)';
COMMENT ON COLUMN admin_notifications.link IS 'URL path to navigate when notification is clicked';
COMMENT ON COLUMN admin_notifications.data IS 'Additional JSON data like order_id, amount, etc.';

