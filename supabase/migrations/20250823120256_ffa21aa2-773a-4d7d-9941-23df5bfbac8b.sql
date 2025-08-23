-- Add new columns to sunsky_orders table
ALTER TABLE public.sunsky_orders 
ADD COLUMN status_last_updated_at TIMESTAMPTZ,
ADD COLUMN last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add new columns to sunsky_order_items table  
ALTER TABLE public.sunsky_order_items
ADD COLUMN item_status TEXT,
ADD COLUMN status_last_updated_at TIMESTAMPTZ,
ADD COLUMN expected_ship_date TIMESTAMPTZ,
ADD COLUMN last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create RPC function to get slow/delayed items
CREATE OR REPLACE FUNCTION get_sunsky_slow_items(
  threshold_days INTEGER DEFAULT 3
) 
RETURNS TABLE (
  order_number TEXT,
  sku_code TEXT,
  title TEXT,
  item_status TEXT,
  days_in_status INTEGER,
  expected_ship_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    AND (soi.item_status IS NULL OR soi.item_status NOT IN ('shipped', 'delivered'))
    AND (
      (soi.status_last_updated_at IS NOT NULL AND EXTRACT(days FROM now() - soi.status_last_updated_at) > threshold_days) OR
      (soi.status_last_updated_at IS NULL AND EXTRACT(days FROM now() - soi.created_at) > threshold_days)
    )
  ORDER BY days_in_status DESC, soi.created_at ASC;
END;
$$;