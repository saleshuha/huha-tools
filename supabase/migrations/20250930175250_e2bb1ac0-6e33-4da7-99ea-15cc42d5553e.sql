-- Temporarily drop the trigger that's interfering
DROP TRIGGER IF EXISTS update_asin_status_on_quantity_change ON asin_inventory;
DROP TRIGGER IF EXISTS trigger_update_asin_status_on_quantity_change ON asin_inventory;

-- Now run the update again
SELECT * FROM update_no_stock_statuses();

-- Recreate the trigger but with better logic
CREATE OR REPLACE FUNCTION update_status_based_on_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-update status if quantity changes AND status is being set programmatically
  -- Don't override manual status changes for 'no-stock', 'reserved', 'damaged', 'ordered'
  IF TG_OP = 'UPDATE' AND OLD.quantity != NEW.quantity THEN
    -- Don't override these statuses
    IF NEW.status NOT IN ('no-stock', 'reserved', 'damaged', 'ordered', 'out-of-stock') THEN
      IF NEW.quantity > 0 THEN
        NEW.status = 'in-stock';
      ELSIF NEW.quantity = 0 THEN
        NEW.status = 'sold';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- For new inserts, set status based on quantity if not explicitly set
    IF NEW.quantity > 0 AND NEW.status IS NULL THEN
      NEW.status = 'in-stock';
    ELSIF NEW.quantity = 0 AND NEW.status IS NULL THEN
      NEW.status = 'no-stock';  -- Default to no-stock for new items with 0 quantity
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_asin_status_on_quantity_change
  BEFORE INSERT OR UPDATE ON asin_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_status_based_on_quantity();

-- Verify
SELECT status, COUNT(*) FROM asin_inventory WHERE quantity = 0 GROUP BY status;