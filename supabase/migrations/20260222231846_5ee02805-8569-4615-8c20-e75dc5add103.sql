
-- Backfill market_item_costs for items assigned via purchase links before the RLS fix
INSERT INTO public.market_item_costs (user_id, asin, sku, title, unit_cost, supplier_name, source)
SELECT 
  mpl.user_id,
  (item->>'asin')::text,
  (item->>'sku')::text,
  (item->>'title')::text,
  COALESCE((item->>'unit_cost')::numeric, 0),
  (item->>'supplier_name')::text,
  'link'
FROM public.market_purchase_links mpl,
  jsonb_array_elements(mpl.items::jsonb) AS item
WHERE item->>'supplier_name' IS NOT NULL
ON CONFLICT (user_id, asin) DO UPDATE SET
  unit_cost = EXCLUDED.unit_cost,
  supplier_name = EXCLUDED.supplier_name,
  updated_at = now();
