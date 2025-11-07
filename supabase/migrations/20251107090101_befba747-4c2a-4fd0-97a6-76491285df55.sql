-- Add column to track manual restock overrides
ALTER TABLE asin_inventory 
ADD COLUMN IF NOT EXISTS manual_restock_override BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_asin_inventory_manual_override 
ON asin_inventory(user_id, manual_restock_override) 
WHERE manual_restock_override = true;

-- Also add to sku_inventory for consistency
ALTER TABLE sku_inventory 
ADD COLUMN IF NOT EXISTS manual_restock_override BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sku_inventory_manual_override 
ON sku_inventory(user_id, manual_restock_override) 
WHERE manual_restock_override = true;