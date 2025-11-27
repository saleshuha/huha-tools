-- Backfill missing stock_changes for ALL inventory items with quantity > 0 but no history
-- This fixes 456+ items that were created with stock but have no change history

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
  ai.user_id,
  'asin',
  ai.id,
  ai.asin,
  ai.serial_number,
  ai.sku,
  0,
  ai.quantity,
  ai.quantity,
  'Initial stock on item creation (backfilled)',
  'initial',
  ai.created_at
FROM asin_inventory ai
WHERE ai.quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM stock_changes sc 
    WHERE sc.inventory_id = ai.id
  );