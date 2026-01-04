-- =====================================================
-- Mystery Boxes System
-- =====================================================
-- Adds support for mystery box purchases

-- Add mystery box columns to orders table (if orders table exists)
DO $$ 
BEGIN
    -- Check if orders table exists before adding columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        -- Add mystery box columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_mystery_box') THEN
            ALTER TABLE orders ADD COLUMN is_mystery_box BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'mystery_box_id') THEN
            ALTER TABLE orders ADD COLUMN mystery_box_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'mystery_box_name') THEN
            ALTER TABLE orders ADD COLUMN mystery_box_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'mystery_box_min_value') THEN
            ALTER TABLE orders ADD COLUMN mystery_box_min_value NUMERIC(10, 2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'mystery_box_max_value') THEN
            ALTER TABLE orders ADD COLUMN mystery_box_max_value NUMERIC(10, 2);
        END IF;
        
        -- Columns for the revealed product
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'revealed_product_id') THEN
            ALTER TABLE orders ADD COLUMN revealed_product_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'revealed_product_name') THEN
            ALTER TABLE orders ADD COLUMN revealed_product_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'revealed_product_price') THEN
            ALTER TABLE orders ADD COLUMN revealed_product_price NUMERIC(10, 2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'revealed_at') THEN
            ALTER TABLE orders ADD COLUMN revealed_at TIMESTAMPTZ;
        END IF;
    END IF;
    
    -- Add column to order_items to mark the revealed product
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'is_revealed_product') THEN
            ALTER TABLE order_items ADD COLUMN is_revealed_product BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- Create mystery_boxes table for storing box configurations
CREATE TABLE IF NOT EXISTS mystery_boxes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    min_value NUMERIC(10, 2) NOT NULL,
    max_value NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    rarity_weights JSONB DEFAULT '{"common": 60, "rare": 30, "epic": 10}',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist (in case table was created before)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mystery_boxes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mystery_boxes' AND column_name = 'display_order') THEN
            ALTER TABLE mystery_boxes ADD COLUMN display_order INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mystery_boxes' AND column_name = 'created_at') THEN
            ALTER TABLE mystery_boxes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mystery_boxes' AND column_name = 'updated_at') THEN
            ALTER TABLE mystery_boxes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Insert default mystery boxes
INSERT INTO mystery_boxes (id, name, description, price, min_value, max_value, rarity_weights, display_order)
VALUES 
    ('starter_crate', 'Starter Crate', 'Perfect for beginners - guaranteed value!', 199, 200, 400, '{"common": 60, "rare": 30, "epic": 10}', 1),
    ('pro_crate', 'Pro Crate', 'Higher stakes, better rewards', 499, 500, 1000, '{"common": 40, "rare": 40, "epic": 18, "legendary": 2}', 2),
    ('elite_crate', 'Elite Crate', 'Premium loot for serious collectors', 999, 1000, 2500, '{"rare": 20, "epic": 50, "legendary": 25, "mythic": 5}', 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    rarity_weights = EXCLUDED.rarity_weights,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Create indexes (only if orders table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_orders_is_mystery_box ON orders(is_mystery_box) WHERE is_mystery_box = TRUE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create idx_orders_is_mystery_box: %', SQLERRM;
        END;
        
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_orders_mystery_box_id ON orders(mystery_box_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create idx_orders_mystery_box_id: %', SQLERRM;
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mystery_boxes_is_active ON mystery_boxes(is_active);

-- Enable RLS on mystery_boxes
ALTER TABLE mystery_boxes ENABLE ROW LEVEL SECURITY;

-- Everyone can view active mystery boxes
DROP POLICY IF EXISTS "Anyone can view active mystery boxes" ON mystery_boxes;
CREATE POLICY "Anyone can view active mystery boxes"
ON mystery_boxes
FOR SELECT
TO public
USING (is_active = TRUE);

-- Service role can manage mystery boxes
DROP POLICY IF EXISTS "Service role can manage mystery boxes" ON mystery_boxes;
CREATE POLICY "Service role can manage mystery boxes"
ON mystery_boxes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON mystery_boxes TO anon;
GRANT SELECT ON mystery_boxes TO authenticated;
GRANT ALL ON mystery_boxes TO service_role;

-- Create mystery_box_openings table to track statistics
CREATE TABLE IF NOT EXISTS mystery_box_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    user_id UUID,
    mystery_box_id TEXT NOT NULL,
    mystery_box_name TEXT NOT NULL,
    box_price NUMERIC(10, 2) NOT NULL,
    revealed_product_id TEXT,
    revealed_product_name TEXT,
    revealed_product_price NUMERIC(10, 2),
    rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    profit_margin NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for mystery_box_openings
CREATE INDEX IF NOT EXISTS idx_mystery_box_openings_user_id ON mystery_box_openings(user_id);
CREATE INDEX IF NOT EXISTS idx_mystery_box_openings_box_id ON mystery_box_openings(mystery_box_id);
CREATE INDEX IF NOT EXISTS idx_mystery_box_openings_rarity ON mystery_box_openings(rarity);
CREATE INDEX IF NOT EXISTS idx_mystery_box_openings_created_at ON mystery_box_openings(created_at);

-- Enable RLS on mystery_box_openings
ALTER TABLE mystery_box_openings ENABLE ROW LEVEL SECURITY;

-- Users can view their own openings
DROP POLICY IF EXISTS "Users can view their own openings" ON mystery_box_openings;
CREATE POLICY "Users can view their own openings"
ON mystery_box_openings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can manage all openings
DROP POLICY IF EXISTS "Service role can manage all openings" ON mystery_box_openings;
CREATE POLICY "Service role can manage all openings"
ON mystery_box_openings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anyone can insert (for guest orders)
DROP POLICY IF EXISTS "Anyone can insert openings" ON mystery_box_openings;
CREATE POLICY "Anyone can insert openings"
ON mystery_box_openings
FOR INSERT
TO public
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON mystery_box_openings TO authenticated;
GRANT INSERT ON mystery_box_openings TO anon;
GRANT INSERT ON mystery_box_openings TO authenticated;
GRANT ALL ON mystery_box_openings TO service_role;

-- Function to record mystery box opening
CREATE OR REPLACE FUNCTION record_mystery_box_opening(
    p_order_id UUID,
    p_user_id UUID,
    p_mystery_box_id TEXT,
    p_mystery_box_name TEXT,
    p_box_price NUMERIC,
    p_revealed_product_id TEXT,
    p_revealed_product_name TEXT,
    p_revealed_product_price NUMERIC,
    p_rarity TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO mystery_box_openings (
        order_id,
        user_id,
        mystery_box_id,
        mystery_box_name,
        box_price,
        revealed_product_id,
        revealed_product_name,
        revealed_product_price,
        rarity,
        profit_margin
    ) VALUES (
        p_order_id,
        p_user_id,
        p_mystery_box_id,
        p_mystery_box_name,
        p_box_price,
        p_revealed_product_id,
        p_revealed_product_name,
        p_revealed_product_price,
        p_rarity,
        p_revealed_product_price - p_box_price
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_mystery_box_opening(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION record_mystery_box_opening(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_mystery_box_opening(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, NUMERIC, TEXT) TO anon;

-- =====================================================
-- Done!
-- =====================================================
