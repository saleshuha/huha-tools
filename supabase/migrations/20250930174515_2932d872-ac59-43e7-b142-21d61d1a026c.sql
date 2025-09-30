-- Update items that have no stock changes to 'no-stock' status
-- These are items added with quantity=0 but never had stock added to them

UPDATE asin_inventory 
SET status = 'no-stock'::inventory_status
WHERE quantity = 0 
  AND status IN ('sold'::inventory_status, 'in-stock'::inventory_status)
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
  RAISE NOTICE 'Updated % items to no-stock status (items with no stock history)', updated_count;
END $$;
