-- Create a function to update statuses (runs with elevated permissions)
CREATE OR REPLACE FUNCTION update_no_stock_statuses()
RETURNS TABLE(updated_count integer, no_stock_count integer, still_sold_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count integer;
  v_no_stock_count integer;
  v_still_sold_count integer;
BEGIN
  -- Update items with no stock history to 'no-stock'
  WITH items_to_update AS (
    SELECT ai.id
    FROM asin_inventory ai
    WHERE ai.quantity = 0
      AND ai.status = 'sold'
      AND NOT EXISTS (
        SELECT 1
        FROM stock_changes sc
        WHERE sc.inventory_id = ai.id
          AND sc.inventory_type = 'asin'
      )
  )
  UPDATE asin_inventory
  SET status = 'no-stock'::inventory_status
  WHERE id IN (SELECT id FROM items_to_update);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Get current counts
  SELECT COUNT(*) INTO v_no_stock_count
  FROM asin_inventory
  WHERE status = 'no-stock' AND quantity = 0;
  
  SELECT COUNT(*) INTO v_still_sold_count
  FROM asin_inventory ai
  WHERE ai.quantity = 0
    AND ai.status = 'sold'
    AND NOT EXISTS (
      SELECT 1 FROM stock_changes
      WHERE inventory_id = ai.id AND inventory_type = 'asin'
    );
  
  RETURN QUERY SELECT v_updated_count, v_no_stock_count, v_still_sold_count;
END;
$$;

-- Run the function
SELECT * FROM update_no_stock_statuses();