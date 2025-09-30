-- Temporarily disable RLS to update statuses
ALTER TABLE asin_inventory DISABLE ROW LEVEL SECURITY;

-- Update all items with quantity=0 and NO stock changes to 'no-stock'
UPDATE asin_inventory 
SET status = 'no-stock'
WHERE quantity = 0 
  AND status != 'no-stock'
  AND status != 'ordered'
  AND id NOT IN (
    SELECT DISTINCT inventory_id 
    FROM stock_changes 
    WHERE inventory_type = 'asin'
  );

-- Re-enable RLS
ALTER TABLE asin_inventory ENABLE ROW LEVEL SECURITY;

-- Verify the update
SELECT 
  status, 
  COUNT(*) as count
FROM asin_inventory 
WHERE quantity = 0
GROUP BY status;