-- Function to count restock eligible items (items with proper addition → sale sequence)
CREATE OR REPLACE FUNCTION public.count_restock_eligible_items(country_filter text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT ai.id)
    FROM public.asin_inventory ai
    WHERE ai.country = country_filter
      AND ai.user_id = auth.uid()
      AND ai.status = 'sold'
      AND EXISTS (
        -- Check for at least one stock addition
        SELECT 1 FROM public.stock_changes sc1
        WHERE sc1.inventory_id = ai.id
          AND sc1.change_amount > 0
      )
      AND EXISTS (
        -- Check for at least one stock reduction that came after the first addition
        SELECT 1 FROM public.stock_changes sc2
        WHERE sc2.inventory_id = ai.id
          AND sc2.change_amount < 0
          AND sc2.created_at > (
            SELECT MIN(sc3.created_at)
            FROM public.stock_changes sc3
            WHERE sc3.inventory_id = ai.id
              AND sc3.change_amount > 0
          )
      )
  );
END;
$$;

-- Function to get IDs of restock eligible items
CREATE OR REPLACE FUNCTION public.get_restock_eligible_item_ids(country_filter text)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ai.id
  FROM public.asin_inventory ai
  WHERE ai.country = country_filter
    AND ai.user_id = auth.uid()
    AND ai.status = 'sold'
    AND EXISTS (
      -- Check for at least one stock addition
      SELECT 1 FROM public.stock_changes sc1
      WHERE sc1.inventory_id = ai.id
        AND sc1.change_amount > 0
    )
    AND EXISTS (
      -- Check for at least one stock reduction that came after the first addition
      SELECT 1 FROM public.stock_changes sc2
      WHERE sc2.inventory_id = ai.id
        AND sc2.change_amount < 0
        AND sc2.created_at > (
          SELECT MIN(sc3.created_at)
          FROM public.stock_changes sc3
          WHERE sc3.inventory_id = ai.id
            AND sc3.change_amount > 0
        )
    );
END;
$$;