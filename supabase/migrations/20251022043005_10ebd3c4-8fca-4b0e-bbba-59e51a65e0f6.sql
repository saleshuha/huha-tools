-- Remove duplicate PO orders, keeping only the most recent entry for each unique combination
-- Uses po_key and item_key which are the actual identity fields

WITH duplicates AS (
  SELECT 
    id,
    po_key,
    item_key,
    user_id,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, po_key, item_key
      ORDER BY created_at DESC, updated_at DESC
    ) as row_num
  FROM po_orders
  WHERE po_key IS NOT NULL AND item_key IS NOT NULL
)
DELETE FROM po_orders
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);

-- Log the cleanup result
SELECT COUNT(*) as total_remaining_records FROM po_orders;