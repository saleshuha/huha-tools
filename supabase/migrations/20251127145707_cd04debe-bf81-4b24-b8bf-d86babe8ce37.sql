-- Backfill missing stock_change record for item B0FL842CDZ
-- This item was created with quantity=1 but has no stock change history

INSERT INTO stock_changes (
  user_id,
  inventory_type,
  inventory_id,
  asin,
  serial_number,
  sku_number,
  previous_quantity,
  new_quantity,
  change_amount,
  change_reason,
  reference_type,
  created_at
)
SELECT 
  user_id,
  'asin',
  id,
  asin,
  serial_number,
  sku,
  0,
  quantity,
  quantity,
  'Initial stock on item creation (backfilled)',
  'initial',
  created_at
FROM asin_inventory
WHERE id = 'c5d8a6d0-7787-4fcd-8648-f8d349aa9aaf'
  AND NOT EXISTS (
    SELECT 1 FROM stock_changes 
    WHERE inventory_id = 'c5d8a6d0-7787-4fcd-8648-f8d349aa9aaf'
  );