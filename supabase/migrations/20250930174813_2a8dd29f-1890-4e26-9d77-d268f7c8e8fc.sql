-- Fix: Update all items with quantity=0 and NO stock changes to 'no-stock'
-- The previous migration might not have caught all items

UPDATE asin_inventory 
SET status = 'no-stock'::inventory_status
WHERE quantity = 0 
  AND status != 'no-stock'::inventory_status
  AND status != 'ordered'::inventory_status  -- Don't change ordered items
  AND id NOT IN (
    SELECT DISTINCT inventory_id 
    FROM stock_changes 
    WHERE inventory_type = 'asin'
  );

-- Log the result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % items to no-stock status', updated_count;
END $$;

-- Verify the update
DO $$
DECLARE
  no_stock_count INTEGER;
  sold_with_no_history INTEGER;
BEGIN
  SELECT COUNT(*) INTO no_stock_count
  FROM asin_inventory
  WHERE status = 'no-stock'::inventory_status AND quantity = 0;
  
  SELECT COUNT(*) INTO sold_with_no_history
  FROM asin_inventory ai
  WHERE ai.quantity = 0 
    AND ai.status = 'sold'::inventory_status
    AND NOT EXISTS (
      SELECT 1 FROM stock_changes 
      WHERE inventory_id = ai.id AND inventory_type = 'asin'
    );
  
  RAISE NOTICE 'Now have % items with no-stock status', no_stock_count;
  RAISE NOTICE 'Still have % sold items with no history (should be 0)', sold_with_no_history;
END $$;
