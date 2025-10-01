-- Create function to get quarterly velocity analysis for ASINs
CREATE OR REPLACE FUNCTION public.get_quarterly_velocity_analysis(
  country_filter text DEFAULT NULL,
  lookback_years integer DEFAULT 2
)
RETURNS TABLE(
  asin_id uuid,
  asin text,
  sku text,
  title text,
  serial_number text,
  current_quantity integer,
  total_added bigint,
  total_sold bigint,
  first_added_date timestamp with time zone,
  quarterly_data jsonb,
  recommended_quantity integer,
  velocity_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH asin_data AS (
    SELECT 
      ai.id,
      ai.asin,
      ai.sku,
      ai.title,
      ai.serial_number,
      ai.quantity,
      ai.date_added,
      ai.user_id
    FROM public.asin_inventory ai
    WHERE ai.user_id = auth.uid()
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.sku IS NOT NULL 
      AND ai.sku != ''
  ),
  stock_movements AS (
    SELECT 
      sc.inventory_id,
      sc.change_amount,
      sc.created_at,
      EXTRACT(YEAR FROM sc.created_at) as year,
      EXTRACT(QUARTER FROM sc.created_at) as quarter
    FROM public.stock_changes sc
    WHERE sc.created_at >= (now() - make_interval(years => lookback_years))
      AND EXISTS (SELECT 1 FROM asin_data ad WHERE ad.id = sc.inventory_id)
  ),
  quarterly_stats AS (
    SELECT 
      sm.inventory_id,
      jsonb_object_agg(
        CONCAT(sm.year, '-Q', sm.quarter),
        jsonb_build_object(
          'added', COALESCE(SUM(CASE WHEN sm.change_amount > 0 THEN sm.change_amount ELSE 0 END), 0),
          'sold', COALESCE(ABS(SUM(CASE WHEN sm.change_amount < 0 THEN sm.change_amount ELSE 0 END)), 0),
          'net', COALESCE(SUM(sm.change_amount), 0)
        )
      ) as quarterly_breakdown
    FROM stock_movements sm
    GROUP BY sm.inventory_id
  ),
  totals AS (
    SELECT 
      sc.inventory_id,
      COALESCE(SUM(CASE WHEN sc.change_amount > 0 THEN sc.change_amount ELSE 0 END), 0) as total_added,
      COALESCE(ABS(SUM(CASE WHEN sc.change_amount < 0 THEN sc.change_amount ELSE 0 END)), 0) as total_sold,
      COALESCE(AVG(CASE WHEN sc.change_amount < 0 THEN ABS(sc.change_amount) ELSE NULL END), 0) as avg_sale_qty
    FROM public.stock_changes sc
    WHERE EXISTS (SELECT 1 FROM asin_data ad WHERE ad.id = sc.inventory_id)
    GROUP BY sc.inventory_id
  )
  SELECT 
    ad.id as asin_id,
    ad.asin,
    ad.sku,
    ad.title,
    ad.serial_number,
    ad.quantity as current_quantity,
    COALESCE(t.total_added, 0)::bigint as total_added,
    COALESCE(t.total_sold, 0)::bigint as total_sold,
    ad.date_added as first_added_date,
    COALESCE(qs.quarterly_breakdown, '{}'::jsonb) as quarterly_data,
    -- Calculate recommended quantity based on velocity
    CASE 
      WHEN t.total_sold > 0 AND EXTRACT(days FROM (now() - ad.date_added)) > 0 THEN
        GREATEST(
          1,
          CEIL((t.total_sold / NULLIF(EXTRACT(days FROM (now() - ad.date_added)), 0)) * 90)
        )
      ELSE 
        CASE 
          WHEN ad.quantity = 0 THEN 5
          ELSE 3
        END
    END::integer as recommended_quantity,
    -- Velocity score (items per day)
    CASE 
      WHEN EXTRACT(days FROM (now() - ad.date_added)) > 0 
      THEN (t.total_sold / NULLIF(EXTRACT(days FROM (now() - ad.date_added)), 0))
      ELSE 0 
    END as velocity_score
  FROM asin_data ad
  LEFT JOIN quarterly_stats qs ON qs.inventory_id = ad.id
  LEFT JOIN totals t ON t.inventory_id = ad.id
  ORDER BY velocity_score DESC NULLS LAST, ad.asin;
END;
$$;

-- Create table to store manual quantity overrides
CREATE TABLE IF NOT EXISTS public.velocity_quantity_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asin_id uuid NOT NULL REFERENCES public.asin_inventory(id) ON DELETE CASCADE,
  recommended_quantity integer NOT NULL,
  system_recommendation integer NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.velocity_quantity_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own quantity overrides"
ON public.velocity_quantity_overrides
FOR ALL
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_velocity_overrides_user_asin 
ON public.velocity_quantity_overrides(user_id, asin_id);

-- Add trigger for updated_at
CREATE TRIGGER set_velocity_overrides_updated_at
BEFORE UPDATE ON public.velocity_quantity_overrides
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();