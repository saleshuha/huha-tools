-- Create enhanced RPC function for comprehensive restock management
CREATE OR REPLACE FUNCTION public.get_items_needing_replenishment(
  country_filter text DEFAULT NULL::text,
  lookback_days integer DEFAULT 30
)
RETURNS TABLE(
  table_name text,
  item_id uuid,
  identifier text,
  current_quantity integer,
  status text,
  last_restock_quantity integer,
  units_sold_since_restock integer,
  days_since_last_restock integer,
  recommended_order_quantity integer,
  replenishment_reason text,
  sku text,
  asin text,
  urgency_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH item_sales AS (
    -- Calculate sales since last restock for each ASIN item
    SELECT 
      ai.id,
      ai.asin,
      ai.sku,
      ai.serial_number,
      ai.quantity,
      ai.status,
      ai.last_restock_date,
      ai.restock_quantity,
      -- Count negative stock changes (sales) since last restock
      COALESCE((
        SELECT COUNT(*)
        FROM stock_changes sc
        WHERE sc.inventory_id = ai.id
          AND sc.change_amount < 0
          AND (ai.last_restock_date IS NULL OR sc.created_at > ai.last_restock_date)
          AND sc.created_at >= (now() - make_interval(days => lookback_days))
      ), 0) as units_sold_since_restock,
      -- Days since last restock
      CASE 
        WHEN ai.last_restock_date IS NULL THEN 
          EXTRACT(days FROM now() - ai.date_added)::integer
        ELSE 
          EXTRACT(days FROM now() - ai.last_restock_date)::integer
      END as days_since_last_restock
    FROM asin_inventory ai
    WHERE ai.eligible_for_restock = true
      AND (country_filter IS NULL OR ai.country = country_filter)
      AND ai.user_id = auth.uid()
  )
  SELECT 
    'asin_inventory'::text as table_name,
    s.id as item_id,
    (s.asin || ' (' || COALESCE(s.serial_number, 'N/A') || ')' || 
     CASE WHEN s.sku IS NOT NULL AND s.sku != '' THEN ' | SKU: ' || s.sku ELSE ' - No SKU' END)::text as identifier,
    s.quantity as current_quantity,
    s.status::text as status,
    COALESCE(s.restock_quantity, 0)::integer as last_restock_quantity,
    s.units_sold_since_restock::integer as units_sold_since_restock,
    s.days_since_last_restock::integer as days_since_last_restock,
    -- Calculate recommended order quantity using 2x last restock or smart defaults
    CASE 
      -- Completely out of stock items
      WHEN s.quantity = 0 THEN
        CASE 
          WHEN s.restock_quantity > 0 THEN s.restock_quantity * 2
          WHEN s.units_sold_since_restock > 0 THEN s.units_sold_since_restock * 2
          ELSE 5 -- Minimum fallback for items with no history
        END
      -- Items that have sold units but still have stock (replenishment logic)
      WHEN s.units_sold_since_restock > 0 THEN
        CASE 
          WHEN s.restock_quantity > 0 THEN s.restock_quantity * 2
          ELSE s.units_sold_since_restock * 2
        END
      ELSE 0 -- No recommendation for items without sales
    END::integer as recommended_order_quantity,
    -- Reason for replenishment
    CASE 
      WHEN s.quantity = 0 THEN 'Out of Stock'
      WHEN s.units_sold_since_restock > 0 THEN 'Sold Units - Needs Replenishment'
      ELSE 'No Action Needed'
    END::text as replenishment_reason,
    s.sku::text as sku,
    s.asin::text as asin,
    -- Urgency level based on quantity and sales
    CASE 
      WHEN s.quantity = 0 THEN 'Critical'
      WHEN s.quantity <= 2 AND s.units_sold_since_restock > 0 THEN 'High'
      WHEN s.quantity <= 5 AND s.units_sold_since_restock > 0 THEN 'Medium'
      WHEN s.units_sold_since_restock > 0 THEN 'Low'
      ELSE 'None'
    END::text as urgency_level
  FROM item_sales s
  WHERE (
    -- Include items that are completely out of stock
    s.quantity = 0 
    OR 
    -- Include items that have sold units since last restock (new logic)
    s.units_sold_since_restock > 0
  )
  AND s.status != 'ordered' -- Exclude items already marked as ordered
  AND (s.sku IS NOT NULL AND s.sku != '') -- Only items with SKU for Sunsky ordering
  ORDER BY 
    -- Prioritize by urgency: out of stock first, then by sales volume
    CASE 
      WHEN s.quantity = 0 THEN 1
      WHEN s.units_sold_since_restock > 0 THEN 2
      ELSE 3
    END,
    s.units_sold_since_restock DESC,
    s.days_since_last_restock DESC NULLS LAST;
END;
$$;