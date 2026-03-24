
-- 1. Functional index on print_eligible_items for fast lookup
CREATE INDEX IF NOT EXISTS idx_pei_upper_trim_identifier 
ON public.print_eligible_items (user_id, upper(trim(identifier))) 
WHERE is_active = true;

-- 2. Functional index on order_imports for SKU matching
CREATE INDEX IF NOT EXISTS idx_oi_user_created_upper_sku 
ON public.order_imports (user_id, created_at, upper(trim(sku)));

-- 3. Rewrite function to use EXISTS subquery instead of LEFT JOIN
CREATE OR REPLACE FUNCTION public.get_printable_orders(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  date_filter_type TEXT DEFAULT 'created_at',
  status_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  order_id TEXT,
  asin TEXT,
  sku TEXT,
  item_title TEXT,
  item_quantity INTEGER,
  order_place_date TEXT,
  order_status TEXT,
  created_at TIMESTAMPTZ,
  source_file TEXT,
  printable BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_id,
    o.asin,
    o.sku,
    o.item_title,
    o.item_quantity,
    o.order_place_date,
    o.order_status,
    o.created_at,
    o.source_file,
    EXISTS (
      SELECT 1 FROM public.print_eligible_items pei
      WHERE pei.user_id = o.user_id
        AND upper(trim(pei.identifier)) = upper(trim(o.sku))
        AND pei.is_active = true
        AND (lower(pei.type) = 'sku' OR pei.type IS NULL)
    ) AS printable
  FROM public.order_imports o
  WHERE o.user_id = auth.uid()
    AND (
      CASE 
        WHEN date_filter_type = 'order_date' THEN
          o.order_place_date IS NOT NULL AND
          o.order_place_date >= to_char(start_date::date, 'YYYY-MM-DD') AND
          o.order_place_date <= to_char(end_date::date, 'YYYY-MM-DD')
        ELSE
          o.created_at >= start_date AND o.created_at <= end_date
      END
    )
    AND (
      status_filter = 'all' OR o.order_status = status_filter
    )
  ORDER BY o.created_at DESC NULLS LAST;
END;
$$;
