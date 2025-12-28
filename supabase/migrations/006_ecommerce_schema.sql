-- Migration 006: E-commerce Schema
-- Creates tables for orders, addresses, reviews, and downloads

-- ============================================
-- ADDRESS TYPES ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE address_type AS ENUM ('billing', 'shipping');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ORDER STATUS ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- REVIEW STATUS ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'published', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- REPORT STATUS ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'action_taken', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- USER ADDRESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type address_type NOT NULL,
  is_default BOOLEAN DEFAULT false,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
  phone VARCHAR(15), -- Stored as digits only: 27XXXXXXXXX (SA format)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON user_addresses(user_id, type);

-- RLS Policies for user_addresses
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addresses" ON user_addresses;
CREATE POLICY "Users can view their own addresses" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own addresses" ON user_addresses;
CREATE POLICY "Users can insert their own addresses" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON user_addresses;
CREATE POLICY "Users can update their own addresses" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON user_addresses;
CREATE POLICY "Users can delete their own addresses" ON user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  -- Shipping Address (snapshot at time of order)
  shipping_name VARCHAR(100),
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_province VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100),
  shipping_phone VARCHAR(15), -- Stored as digits only: 27XXXXXXXXX
  -- Billing Address (snapshot at time of order)
  billing_name VARCHAR(100),
  billing_address_line1 VARCHAR(255),
  billing_address_line2 VARCHAR(255),
  billing_city VARCHAR(100),
  billing_province VARCHAR(100),
  billing_postal_code VARCHAR(20),
  billing_country VARCHAR(100),
  billing_phone VARCHAR(15), -- Stored as digits only: 27XXXXXXXXX
  -- Tracking
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(512),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- RLS Policies for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_slug VARCHAR(255),
  product_image VARCHAR(512),
  variant_id VARCHAR(100),
  variant_name VARCHAR(255),
  sku VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  -- For digital products
  is_digital BOOLEAN DEFAULT false,
  download_url VARCHAR(512),
  download_limit INTEGER DEFAULT 5,
  download_count INTEGER DEFAULT 0,
  download_expires_at TIMESTAMPTZ,
  -- Review tracking
  has_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- RLS Policies for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- ============================================
-- PRODUCT REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_slug VARCHAR(255),
  product_image VARCHAR(512),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  status review_status NOT NULL DEFAULT 'pending',
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT false,
  admin_response TEXT,
  admin_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);

-- RLS Policies for product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published reviews" ON product_reviews;
CREATE POLICY "Users can view published reviews" ON product_reviews
  FOR SELECT USING (status = 'published' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own reviews" ON product_reviews;
CREATE POLICY "Users can insert their own reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON product_reviews;
CREATE POLICY "Users can update their own reviews" ON product_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON product_reviews;
CREATE POLICY "Users can delete their own reviews" ON product_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- REVIEW REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_reports_user_id ON review_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);

-- RLS Policies for review_reports
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reports" ON review_reports;
CREATE POLICY "Users can view their own reports" ON review_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reports" ON review_reports;
CREATE POLICY "Users can insert their own reports" ON review_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- REVIEW HELPFUL VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);

-- RLS Policies
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes" ON review_votes;
CREATE POLICY "Users can view all votes" ON review_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own votes" ON review_votes;
CREATE POLICY "Users can insert their own votes" ON review_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON review_votes;
CREATE POLICY "Users can update their own votes" ON review_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- USER DOWNLOADS TABLE (for digital purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS user_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT, -- in bytes
  file_type VARCHAR(50),
  download_url VARCHAR(512),
  download_limit INTEGER DEFAULT 5,
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_downloads_user_id ON user_downloads(user_id);

-- RLS Policies
ALTER TABLE user_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own downloads" ON user_downloads;
CREATE POLICY "Users can view their own downloads" ON user_downloads
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a number like "DP-240001"
    new_number := 'DP-' || TO_CHAR(NOW(), 'YY') || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  processing_orders BIGINT,
  delivered_orders BIGINT,
  total_spent DECIMAL,
  total_reviews BIGINT,
  helpful_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id AND status = 'processing')::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id AND status = 'delivered')::BIGINT,
    COALESCE((SELECT SUM(total) FROM orders WHERE user_id = p_user_id), 0)::DECIMAL,
    (SELECT COUNT(*) FROM product_reviews WHERE user_id = p_user_id)::BIGINT,
    COALESCE((SELECT SUM(helpful_count) FROM product_reviews WHERE user_id = p_user_id), 0)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

-- Function to get reviewable products (purchased but not reviewed)
CREATE OR REPLACE FUNCTION get_reviewable_products(p_user_id UUID)
RETURNS TABLE (
  order_item_id UUID,
  product_id VARCHAR,
  product_name VARCHAR,
  product_slug VARCHAR,
  product_image VARCHAR,
  order_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.id AS order_item_id,
    oi.product_id,
    oi.product_name,
    oi.product_slug,
    oi.product_image,
    o.created_at AS order_date
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.user_id = p_user_id
    AND o.status = 'delivered'
    AND oi.has_reviewed = false
    AND NOT EXISTS (
      SELECT 1 FROM product_reviews pr 
      WHERE pr.user_id = p_user_id 
        AND pr.product_id = oi.product_id
    )
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_reviewable_products(UUID) TO authenticated;

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Mark order item as reviewed
-- ============================================
CREATE OR REPLACE FUNCTION mark_order_item_reviewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_item_id IS NOT NULL THEN
    UPDATE order_items SET has_reviewed = true WHERE id = NEW.order_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mark_item_reviewed_on_review ON product_reviews;
CREATE TRIGGER mark_item_reviewed_on_review
  AFTER INSERT ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION mark_order_item_reviewed();

