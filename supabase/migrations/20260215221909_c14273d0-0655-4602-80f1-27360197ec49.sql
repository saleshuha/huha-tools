
-- Backfill serial_number from asin_inventory
UPDATE processed_orders po
SET serial_number = ai.serial_number
FROM asin_inventory ai
WHERE po.inventory_id = ai.id
  AND po.serial_number IS NULL;

-- Backfill serial_number from sku_inventory  
UPDATE processed_orders po
SET serial_number = si.bin_serial_number
FROM sku_inventory si
WHERE po.inventory_id = si.id
  AND po.serial_number IS NULL;
