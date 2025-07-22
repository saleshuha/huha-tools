-- Add triggers to automatically update status based on quantity for both inventory tables

-- Function to update status based on quantity
CREATE OR REPLACE FUNCTION public.update_status_based_on_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- If quantity is 0, set status to 'sold'
  IF NEW.quantity = 0 THEN
    NEW.status = 'sold';
    -- Set date_sold if it's not already set
    IF NEW.date_sold IS NULL THEN
      NEW.date_sold = now();
    END IF;
  -- If quantity is greater than 0, set status to 'in-stock'  
  ELSIF NEW.quantity > 0 THEN
    NEW.status = 'in-stock';
    -- Clear date_sold when back in stock
    NEW.date_sold = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for asin_inventory table
DROP TRIGGER IF EXISTS trigger_update_asin_status_on_quantity_change ON public.asin_inventory;
CREATE TRIGGER trigger_update_asin_status_on_quantity_change
  BEFORE INSERT OR UPDATE OF quantity ON public.asin_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_based_on_quantity();

-- Add trigger for sku_inventory table  
DROP TRIGGER IF EXISTS trigger_update_sku_status_on_quantity_change ON public.sku_inventory;
CREATE TRIGGER trigger_update_sku_status_on_quantity_change
  BEFORE INSERT OR UPDATE OF quantity ON public.sku_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_status_based_on_quantity();

-- Update existing records to match the new logic
UPDATE public.asin_inventory 
SET status = CASE 
  WHEN quantity = 0 THEN 'sold'::inventory_status
  WHEN quantity > 0 THEN 'in-stock'::inventory_status
  ELSE status
END,
date_sold = CASE 
  WHEN quantity = 0 AND date_sold IS NULL THEN now()
  WHEN quantity > 0 THEN NULL
  ELSE date_sold
END;

UPDATE public.sku_inventory 
SET status = CASE 
  WHEN quantity = 0 THEN 'sold'::inventory_status
  WHEN quantity > 0 THEN 'in-stock'::inventory_status
  ELSE status
END,
date_sold = CASE 
  WHEN quantity = 0 AND date_sold IS NULL THEN now()
  WHEN quantity > 0 THEN NULL
  ELSE date_sold
END;