CREATE OR REPLACE FUNCTION public.get_cost_dates_for_asins(p_user_id uuid, p_asins text[])
RETURNS TABLE(asin text, unit_cost numeric, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT c.asin, c.unit_cost, c.updated_at
  FROM public.market_item_costs c
  WHERE c.user_id = p_user_id AND c.asin = ANY(p_asins);
$$;