-- Update existing records to use the new status values correctly
-- Items with quantity = 0 and no stock_changes should be 'no-stock'
-- Items with quantity = 0 and stock_changes with additions should be 'out-of-stock' or keep 'sold'

-- Update items with no stock history to 'no-stock'
UPDATE asin_inventory 
SET status = 'no-stock'::inventory_status
WHERE quantity = 0 
  AND status = 'sold'::inventory_status
  AND NOT EXISTS (
    SELECT 1 FROM stock_changes 
    WHERE stock_changes.inventory_id = asin_inventory.id 
      AND stock_changes.inventory_type = 'asin'
  );

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % items from sold to no-stock status', updated_count;
END $$;
