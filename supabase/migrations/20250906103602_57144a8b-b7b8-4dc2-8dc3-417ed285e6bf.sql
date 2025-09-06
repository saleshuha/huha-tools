-- Update the get_sunsky_slow_items function to handle new status mappings
-- Status 3 (ready_to_ship) should NOT be excluded, only 5 (shipped) and 6 (delivered)
DROP FUNCTION IF EXISTS get_sunsky_slow_items(integer);

CREATE OR REPLACE FUNCTION get_sunsky_slow_items(threshold_days integer DEFAULT 3)
RETURNS TABLE (
  order_number text,
  sku_code text,
  title text,
  item_status text,
  days_in_status integer,
  expected_ship_date timestamp with time zone,
  created_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    soi.order_number,
    soi.sku_code,
    soi.title,
    soi.item_status,
    CASE 
      WHEN soi.status_last_updated_at IS NOT NULL 
      THEN EXTRACT(days FROM now() - soi.status_last_updated_at)::INTEGER
      ELSE EXTRACT(days FROM now() - soi.created_at)::INTEGER
    END as days_in_status,
    soi.expected_ship_date,
    soi.created_at
  FROM public.sunsky_order_items soi
  WHERE soi.user_id = auth.uid()
    -- Exclude only shipped (5) and delivered (6) statuses
    AND (soi.item_status IS NULL OR soi.item_status NOT IN ('5', '6', 'shipped', 'delivered'))
    AND (
      (soi.status_last_updated_at IS NOT NULL AND EXTRACT(days FROM now() - soi.status_last_updated_at) > threshold_days) OR
      (soi.status_last_updated_at IS NULL AND EXTRACT(days FROM now() - soi.created_at) > threshold_days)
    )
  ORDER BY days_in_status DESC, soi.created_at ASC;
END;
$$;