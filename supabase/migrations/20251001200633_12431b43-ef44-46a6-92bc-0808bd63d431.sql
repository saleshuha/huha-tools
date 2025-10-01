-- Add tracking fields to asin_inventory for ordered items
ALTER TABLE asin_inventory 
ADD COLUMN IF NOT EXISTS velocity_order_ref text,
ADD COLUMN IF NOT EXISTS sunsky_order_number text,
ADD COLUMN IF NOT EXISTS ordered_quantity integer,
ADD COLUMN IF NOT EXISTS ordered_at timestamp with time zone;

-- Create index for faster queries on velocity orders
CREATE INDEX IF NOT EXISTS idx_asin_inventory_velocity_order_ref ON asin_inventory(velocity_order_ref);
CREATE INDEX IF NOT EXISTS idx_asin_inventory_sunsky_order_number ON asin_inventory(sunsky_order_number);

COMMENT ON COLUMN asin_inventory.velocity_order_ref IS 'Reference number for velocity-based orders (e.g., VELOCITY-1234567890)';
COMMENT ON COLUMN asin_inventory.sunsky_order_number IS 'Sunsky order number when item is ordered through velocity system';
COMMENT ON COLUMN asin_inventory.ordered_quantity IS 'Quantity that was ordered through velocity system';
COMMENT ON COLUMN asin_inventory.ordered_at IS 'Timestamp when item was marked as ordered through velocity system';