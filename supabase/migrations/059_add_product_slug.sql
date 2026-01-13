-- Add slug column to admin_products table
-- Format: product-name-in-lowercase-{fullCJProductId}
ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS slug VARCHAR(500);

-- Create unique index for efficient slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_products_slug ON admin_products(slug) WHERE slug IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN admin_products.slug IS 'URL-friendly product slug for website routing (format: product-name-{cjProductId})';

