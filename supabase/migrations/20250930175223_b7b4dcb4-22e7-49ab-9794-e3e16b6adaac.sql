-- Create a function to update inventory status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.fix_no_stock_statuses()
RETURNS TABLE(updated_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_updated bigint;
BEGIN
  -- Update items with quantity=0, status='sold', and no stock changes
  UPDATE asin_inventory 
  SET status = 'no-stock'::inventory_status
  WHERE quantity = 0 
    AND status = 'sold'::inventory_status
    AND id NOT IN (
      SELECT DISTINCT inventory_id 
      FROM stock_changes 
      WHERE inventory_type = 'asin'
    );
  
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  
  RETURN QUERY SELECT count_updated;
END;
$$;

-- Execute the function
SELECT * FROM public.fix_no_stock_statuses();

-- Drop the function after use
DROP FUNCTION IF EXISTS public.fix_no_stock_statuses();
