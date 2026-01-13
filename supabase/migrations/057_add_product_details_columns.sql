-- Add detailed product information columns to admin_products
-- This stores specifications, features, package contents, and full descriptions

-- Add sell_point column for product features/selling points
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS sell_point TEXT;

-- Add raw_description to store the full unmodified description from CJ
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS raw_description TEXT;

-- Add package_contents for what's included
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS package_contents TEXT;

-- Add specifications as JSONB for structured specs data
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}';

-- Add features as an array of feature strings
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';

-- Add remark for additional notes from supplier
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS remark TEXT;

-- Add package_weight for shipping calculations
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS package_weight DECIMAL(10,2) DEFAULT 0;

-- Add product_sku from CJ
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS product_sku VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN admin_products.sell_point IS 'Product selling points/features from CJ';
COMMENT ON COLUMN admin_products.raw_description IS 'Full original description from CJ, may contain HTML';
COMMENT ON COLUMN admin_products.package_contents IS 'What is included in the package';
COMMENT ON COLUMN admin_products.specifications IS 'Structured product specifications as JSON';
COMMENT ON COLUMN admin_products.features IS 'Array of product feature strings';
COMMENT ON COLUMN admin_products.remark IS 'Additional remarks or notes from supplier';
COMMENT ON COLUMN admin_products.package_weight IS 'Package weight in kg for shipping';
COMMENT ON COLUMN admin_products.product_sku IS 'CJ product SKU';

