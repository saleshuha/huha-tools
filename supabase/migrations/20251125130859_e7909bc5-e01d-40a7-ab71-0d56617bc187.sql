-- Update trigger to set first_stock_added_at only when stock is first added (not when created with 0)
CREATE OR REPLACE FUNCTION set_first_stock_added_at()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: Set first_stock_added_at only if quantity > 0
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity > 0 AND NEW.first_stock_added_at IS NULL THEN
      NEW.first_stock_added_at = NOW();
    END IF;
  END IF;
  
  -- On UPDATE: Set first_stock_added_at when stock is first added (0 -> >0)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.quantity = 0 AND NEW.quantity > 0 AND NEW.first_stock_added_at IS NULL THEN
      NEW.first_stock_added_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to also fire on UPDATE
DROP TRIGGER IF EXISTS set_first_stock_asin_inventory ON asin_inventory;
CREATE TRIGGER set_first_stock_asin_inventory
  BEFORE INSERT OR UPDATE ON asin_inventory
  FOR EACH ROW
  EXECUTE FUNCTION set_first_stock_added_at();