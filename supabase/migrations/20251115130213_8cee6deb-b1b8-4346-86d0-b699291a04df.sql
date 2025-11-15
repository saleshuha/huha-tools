-- Add partial unique constraint to prevent future duplicate non-empty serial numbers
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_serial_non_empty 
ON asin_inventory (user_id, serial_number) 
WHERE serial_number != '';

COMMENT ON INDEX unique_user_serial_non_empty IS 'Prevents duplicate non-empty serial numbers per user while allowing multiple empty serials';