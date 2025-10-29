-- Create RPC function for accurate inventory metrics calculation
CREATE OR REPLACE FUNCTION get_inventory_metrics(p_country text, p_user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_asins', COUNT(*),
    'total_units', COALESCE(SUM(quantity), 0),
    'in_stock_count', COUNT(*) FILTER (WHERE status = 'in-stock' AND quantity > 0),
    'out_of_stock_count', COUNT(*) FILTER (WHERE status = 'out-of-stock' OR quantity = 0),
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