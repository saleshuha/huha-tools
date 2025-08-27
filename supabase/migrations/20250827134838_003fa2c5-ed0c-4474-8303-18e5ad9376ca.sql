
CREATE OR REPLACE FUNCTION public.get_printable_orders(
  start_date timestamptz,
  end_date timestamptz,
  date_filter_type text DEFAULT 'created_at', -- 'created_at' (upload date) or 'order_date'
  status_filter text DEFAULT 'all'            -- 'all' or a specific order_status value
)
RETURNS TABLE(
  id uuid,
  order_id text,
  asin text,
  sku text,
  item_title text,
  item_quantity integer,
  order_place_date text,
  order_status text,
  created_at timestamptz,
  source_file text,
  printable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    (pei.id IS NOT NULL) AS printable
  FROM public.order_imports o
  LEFT JOIN public.print_eligible_items pei
    ON pei.user_id = o.user_id
    AND pei.identifier = o.sku
    AND pei.is_active = true
    AND (pei.type = 'sku' OR pei.type IS NULL)
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
$function$;
