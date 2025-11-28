-- Part 1: Update RPC function to use quantity-based logic only
CREATE OR REPLACE FUNCTION get_inventory_metrics(p_country text, p_user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_asins', COUNT(*),
    'total_units', COALESCE(SUM(quantity), 0),
    -- FIXED: Use quantity-based logic only, not status field
    'in_stock_count', COUNT(*) FILTER (WHERE quantity > 0),
    'out_of_stock_count', COUNT(*) FILTER (WHERE quantity = 0 OR quantity IS NULL),
    'missing_sku', COUNT(*) FILTER (WHERE sku IS NULL OR sku = ''),
    'missing_title', COUNT(*) FILTER (WHERE title IS NULL OR title = ''),
    'restock_eligible', COUNT(*) FILTER (WHERE eligible_for_restock = true),
    'unique_asins', COUNT(DISTINCT asin)
  ) INTO result
  FROM asin_inventory
  WHERE country = p_country
    AND user_id = p_user_id
    AND (is_active IS NULL OR is_active = true);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 3: Fix data inconsistency - update status field to match quantity
-- Fix items with stock but wrong status
UPDATE asin_inventory
SET status = 'in-stock', updated_at = now()
WHERE quantity > 0 
  AND status IN ('out-of-stock', 'no-stock')
  AND (is_active IS NULL OR is_active = true);

-- Fix items without stock but wrong status  
UPDATE asin_inventory
SET status = 'out-of-stock', updated_at = now()
WHERE (quantity = 0 OR quantity IS NULL)
  AND status NOT IN ('out-of-stock', 'sold', 'ordered')
  AND (is_active IS NULL OR is_active = true);