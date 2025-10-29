-- Add first_stock_added_at column to inventory tables
ALTER TABLE asin_inventory 
ADD COLUMN IF NOT EXISTS first_stock_added_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE sku_inventory 
ADD COLUMN IF NOT EXISTS first_stock_added_at TIMESTAMP WITH TIME ZONE;

-- Backfill first_stock_added_at from stock_changes history
UPDATE asin_inventory ai
SET first_stock_added_at = COALESCE(
  (SELECT MIN(sc.created_at) 
   FROM stock_changes sc
   WHERE sc.inventory_id = ai.id 
     AND sc.inventory_type = 'asin' 
     AND sc.change_amount > 0),
  ai.date_added
)
WHERE first_stock_added_at IS NULL;

UPDATE sku_inventory si
SET first_stock_added_at = COALESCE(
  (SELECT MIN(sc.created_at) 
   FROM stock_changes sc
   WHERE sc.inventory_id = si.id 
     AND sc.inventory_type = 'sku' 
     AND sc.change_amount > 0),
  si.date_added
)
WHERE first_stock_added_at IS NULL;

-- Create trigger function to auto-set first_stock_added_at
CREATE OR REPLACE FUNCTION set_first_stock_added_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set first_stock_added_at on INSERT if quantity > 0 and field is NULL
  IF TG_OP = 'INSERT' AND NEW.quantity > 0 AND NEW.first_stock_added_at IS NULL THEN
    NEW.first_stock_added_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both inventory tables
DROP TRIGGER IF EXISTS set_first_stock_asin_inventory ON asin_inventory;
CREATE TRIGGER set_first_stock_asin_inventory
  BEFORE INSERT ON asin_inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_first_stock_added_at();

DROP TRIGGER IF EXISTS set_first_stock_sku_inventory ON sku_inventory;
CREATE TRIGGER set_first_stock_sku_inventory
  BEFORE INSERT ON sku_inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_first_stock_added_at();

-- Create trigger to set first_stock_added_at from stock_changes
CREATE OR REPLACE FUNCTION set_first_stock_from_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- When a positive stock change is recorded, update first_stock_added_at if NULL
  IF NEW.change_amount > 0 THEN
    IF NEW.inventory_type = 'asin' THEN
      UPDATE asin_inventory
      SET first_stock_added_at = NEW.created_at
      WHERE id = NEW.inventory_id 
        AND first_stock_added_at IS NULL;
    ELSIF NEW.inventory_type = 'sku' THEN
      UPDATE sku_inventory
      SET first_stock_added_at = NEW.created_at
      WHERE id = NEW.inventory_id 
        AND first_stock_added_at IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_first_stock_from_stock_changes ON stock_changes;
CREATE TRIGGER set_first_stock_from_stock_changes
  AFTER INSERT ON stock_changes
  FOR EACH ROW
  EXECUTE FUNCTION set_first_stock_from_changes();