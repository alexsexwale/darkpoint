-- Add USD price and exchange rate columns to admin_products
-- This helps track original CJ prices and the conversion rate used

ALTER TABLE admin_products 
ADD COLUMN IF NOT EXISTS original_price_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(10,4);

-- Add comment for documentation
COMMENT ON COLUMN admin_products.original_price_usd IS 'Original CJ Dropshipping price in USD';
COMMENT ON COLUMN admin_products.exchange_rate_used IS 'USD to ZAR exchange rate used at import time';

-- Update index for products that need repricing based on exchange rate changes
CREATE INDEX IF NOT EXISTS idx_admin_products_usd_price ON admin_products(original_price_usd) WHERE original_price_usd IS NOT NULL;

