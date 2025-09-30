-- Add new inventory status values to support better stock tracking
-- This allows us to differentiate between:
-- 'no-stock': Items added but never had stock
-- 'out-of-stock': Items that had stock but are now depleted

-- Add new enum values (these must be in separate statements and committed before use)
DO $$ 
BEGIN
  -- Add 'no-stock' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'no-stock' AND enumtypid = 'inventory_status'::regtype) THEN
    ALTER TYPE inventory_status ADD VALUE 'no-stock';
  END IF;
  
  -- Add 'out-of-stock' if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'out-of-stock' AND enumtypid = 'inventory_status'::regtype) THEN
    ALTER TYPE inventory_status ADD VALUE 'out-of-stock';
  END IF;
END $$;

-- Add comment explaining the status meanings
COMMENT ON TYPE inventory_status IS 'Inventory status types: in-stock (has stock), sold (explicitly sold), reserved (held), damaged (unusable), ordered (on order), no-stock (added but never stocked), out-of-stock (had stock, now depleted)';
