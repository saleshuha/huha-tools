-- Function to check if item has sales in last 90 days and update restock eligibility
CREATE OR REPLACE FUNCTION public.update_restock_eligibility_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_recent_sales boolean;
BEGIN
  -- Only proceed if this is a sale (negative quantity change)
  IF NEW.change_amount < 0 THEN
    -- Check if there are any sales in the last 90 days for this inventory item
    SELECT EXISTS (
      SELECT 1 
      FROM public.stock_changes 
      WHERE inventory_id = NEW.inventory_id 
        AND change_amount < 0 
        AND created_at >= NOW() - INTERVAL '90 days'
    ) INTO has_recent_sales;
    
    -- If item has recent sales and status is not 'no-stock', mark as eligible for restock
    IF has_recent_sales THEN
      UPDATE public.asin_inventory 
      SET eligible_for_restock = true 
      WHERE id = NEW.inventory_id 
        AND status != 'no-stock';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after stock changes
DROP TRIGGER IF EXISTS trigger_update_restock_eligibility ON public.stock_changes;
CREATE TRIGGER trigger_update_restock_eligibility
  AFTER INSERT ON public.stock_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_restock_eligibility_on_sale();

-- One-time update: Mark all items with sales in last 90 days as restock-eligible (except no-stock items)
UPDATE public.asin_inventory 
SET eligible_for_restock = true 
WHERE id IN (
  SELECT DISTINCT inventory_id 
  FROM public.stock_changes 
  WHERE change_amount < 0 
    AND created_at >= NOW() - INTERVAL '90 days'
)
AND status != 'no-stock';