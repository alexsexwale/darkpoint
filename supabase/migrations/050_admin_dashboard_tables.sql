-- ============================================
-- ADMIN DASHBOARD TABLES
-- Migration for Darkpoint Admin Dashboard
-- ============================================

-- ============================================
-- ADMIN USERS TABLE
-- Users with admin access to the dashboard
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- RLS Policies for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin users
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Only super_admins can manage admin users
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
CREATE POLICY "Super admins can manage admin users" ON admin_users
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin')
  );

-- ============================================
-- ADMIN PRODUCTS TABLE
-- Curated products from CJ Dropshipping
-- ============================================
CREATE TABLE IF NOT EXISTS admin_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cj_product_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10,2),
  markup_percent INTEGER DEFAULT 150,
  category VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  images JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  weight DECIMAL(10,2) DEFAULT 0,
  source_from VARCHAR(100) DEFAULT 'China',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  stock_quantity INTEGER,
  low_stock_threshold INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin_products
CREATE INDEX IF NOT EXISTS idx_admin_products_cj_id ON admin_products(cj_product_id);
CREATE INDEX IF NOT EXISTS idx_admin_products_category ON admin_products(category);
CREATE INDEX IF NOT EXISTS idx_admin_products_active ON admin_products(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_products_featured ON admin_products(is_featured);

-- RLS Policies for admin_products
ALTER TABLE admin_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products (for the main site)
DROP POLICY IF EXISTS "Anyone can view active products" ON admin_products;
CREATE POLICY "Anyone can view active products" ON admin_products
  FOR SELECT USING (is_active = true);

-- Admins can view all products
DROP POLICY IF EXISTS "Admins can view all products" ON admin_products;
CREATE POLICY "Admins can view all products" ON admin_products
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Admins can manage products
DROP POLICY IF EXISTS "Admins can manage products" ON admin_products;
CREATE POLICY "Admins can manage products" ON admin_products
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- ============================================
-- CJ ORDERS TABLE
-- Track orders placed with CJ Dropshipping
-- ============================================
CREATE TABLE IF NOT EXISTS cj_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cj_order_id VARCHAR(100),
  cj_order_number VARCHAR(100),
  cj_status VARCHAR(50),
  cj_tracking_number VARCHAR(100),
  cj_logistic_name VARCHAR(100),
  shipping_cost DECIMAL(10,2),
  error_message TEXT,
  placed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cj_orders
CREATE INDEX IF NOT EXISTS idx_cj_orders_order_id ON cj_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_cj_orders_cj_order_id ON cj_orders(cj_order_id);
CREATE INDEX IF NOT EXISTS idx_cj_orders_status ON cj_orders(cj_status);

-- RLS Policies for cj_orders
ALTER TABLE cj_orders ENABLE ROW LEVEL SECURITY;

-- Admins can manage CJ orders
DROP POLICY IF EXISTS "Admins can manage CJ orders" ON cj_orders;
CREATE POLICY "Admins can manage CJ orders" ON cj_orders
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- ============================================
-- STORE SETTINGS TABLE
-- Configuration for the store
-- ============================================
CREATE TABLE IF NOT EXISTS store_settings (
  id VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- RLS Policies for store_settings
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view store settings
DROP POLICY IF EXISTS "Anyone can view store settings" ON store_settings;
CREATE POLICY "Anyone can view store settings" ON store_settings
  FOR SELECT USING (true);

-- Admins can manage store settings
DROP POLICY IF EXISTS "Admins can manage store settings" ON store_settings;
CREATE POLICY "Admins can manage store settings" ON store_settings
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Insert default store settings
INSERT INTO store_settings (id, value, description) VALUES
  ('shipping', '{"free_threshold": 500, "flat_rate": 75, "express_rate": 150}', 'Shipping configuration'),
  ('markup', '{"default_percent": 150, "featured_percent": 200}', 'Product markup settings'),
  ('currency', '{"code": "ZAR", "symbol": "R", "locale": "en-ZA"}', 'Currency settings'),
  ('notifications', '{"low_stock_email": true, "new_order_email": true}', 'Notification settings')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ADMIN ACTIVITY LOG TABLE
-- Audit trail for admin actions
-- ============================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_log(created_at DESC);

-- RLS Policies for admin_activity_log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view activity log
DROP POLICY IF EXISTS "Admins can view activity log" ON admin_activity_log;
CREATE POLICY "Admins can view activity log" ON admin_activity_log
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Admins can insert activity log
DROP POLICY IF EXISTS "Admins can insert activity log" ON admin_activity_log;
CREATE POLICY "Admins can insert activity log" ON admin_activity_log
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- ============================================
-- UPDATE TRIGGERS
-- Auto-update updated_at timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_products_updated_at ON admin_products;
CREATE TRIGGER update_admin_products_updated_at
  BEFORE UPDATE ON admin_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cj_orders_updated_at ON cj_orders;
CREATE TRIGGER update_cj_orders_updated_at
  BEFORE UPDATE ON cj_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON store_settings;
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_revenue DECIMAL,
  total_orders BIGINT,
  total_members BIGINT,
  pending_orders BIGINT,
  today_revenue DECIMAL,
  today_orders BIGINT,
  week_revenue DECIMAL,
  week_orders BIGINT,
  month_revenue DECIMAL,
  month_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as total_revenue,
    COUNT(DISTINCT o.id) as total_orders,
    (SELECT COUNT(*) FROM user_profiles) as total_members,
    COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'paid' AND o.created_at >= CURRENT_DATE THEN o.total ELSE 0 END), 0) as today_revenue,
    COUNT(DISTINCT CASE WHEN o.created_at >= CURRENT_DATE THEN o.id END) as today_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'paid' AND o.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN o.total ELSE 0 END), 0) as week_revenue,
    COUNT(DISTINCT CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN o.id END) as week_orders,
    COALESCE(SUM(CASE WHEN o.payment_status = 'paid' AND o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN o.total ELSE 0 END), 0) as month_revenue,
    COUNT(DISTINCT CASE WHEN o.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN o.id END) as month_orders
  FROM orders o;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue by date
CREATE OR REPLACE FUNCTION get_revenue_by_date(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  revenue DECIMAL,
  orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(o.created_at) as date,
    COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as revenue,
    COUNT(DISTINCT o.id) as orders
  FROM orders o
  WHERE o.created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY DATE(o.created_at)
  ORDER BY date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_date(INTEGER) TO authenticated;

