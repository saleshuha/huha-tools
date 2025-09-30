-- Direct update without enum casting
UPDATE asin_inventory 
SET status = 'no-stock'
WHERE quantity = 0 
  AND status = 'sold'
  AND id IN (
    SELECT ai.id 
    FROM asin_inventory ai
    LEFT JOIN stock_changes sc ON sc.inventory_id = ai.id AND sc.inventory_type = 'asin'
    WHERE ai.quantity = 0 
      AND ai.status = 'sold'
      AND sc.id IS NULL
    LIMIT 500  -- Do in batches
  );

-- Verify
SELECT 
  status, 
  COUNT(*) as count
FROM asin_inventory 
WHERE quantity = 0
GROUP BY status;