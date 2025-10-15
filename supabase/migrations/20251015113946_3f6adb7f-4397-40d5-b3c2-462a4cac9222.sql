-- Add indexes for PO Tracker performance optimization
-- These indexes will significantly speed up common queries

-- Index for filtering PO orders by user and status
CREATE INDEX IF NOT EXISTS idx_po_orders_user_status 
ON po_orders(user_id, status) 
WHERE status IN ('pending', 'ordered', 'shipped', 'placed');

-- Index for ordering PO orders by creation date (used in pagination)
CREATE INDEX IF NOT EXISTS idx_po_orders_created_id 
ON po_orders(user_id, created_at DESC, id DESC);

-- Index for PO number lookups (frequently used in grouping)
CREATE INDEX IF NOT EXISTS idx_po_orders_po_number 
ON po_orders(user_id, po_number);

-- Index for SKU code joins with sunsky_skus
CREATE INDEX IF NOT EXISTS idx_po_orders_sku_code 
ON po_orders(user_id, sku_code) 
WHERE sku_code IS NOT NULL;

-- Index for model number joins
CREATE INDEX IF NOT EXISTS idx_po_orders_model_number 
ON po_orders(user_id, model_number) 
WHERE model_number IS NOT NULL;

-- Index for ASIN lookups
CREATE INDEX IF NOT EXISTS idx_po_orders_asin 
ON po_orders(user_id, asin) 
WHERE asin IS NOT NULL;

-- Index for sunsky_skus lookups by sku_code
CREATE INDEX IF NOT EXISTS idx_sunsky_skus_sku_code 
ON sunsky_skus(user_id, sku_code);

-- Index for ASIN inventory lookups
CREATE INDEX IF NOT EXISTS idx_asin_inventory_user_asin 
ON asin_inventory(user_id, asin) 
WHERE asin IS NOT NULL;

-- Index for SKU inventory lookups
CREATE INDEX IF NOT EXISTS idx_sku_inventory_user_sku 
ON sku_inventory(user_id, sku_number) 
WHERE sku_number IS NOT NULL;

-- Composite index for country-based filtering
CREATE INDEX IF NOT EXISTS idx_po_orders_user_country 
ON po_orders(user_id, country);

-- Add comment explaining the optimization
COMMENT ON INDEX idx_po_orders_user_status IS 'Optimizes filtering by active order statuses';
COMMENT ON INDEX idx_po_orders_created_id IS 'Optimizes pagination with consistent ordering';
COMMENT ON INDEX idx_po_orders_po_number IS 'Optimizes PO grouping queries';
COMMENT ON INDEX idx_sunsky_skus_sku_code IS 'Optimizes SKU matching joins';