-- Create a function to get all sunsky SKUs without limit
CREATE OR REPLACE FUNCTION get_all_sunsky_skus(user_id_param UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  sku_code TEXT,
  title TEXT,
  description TEXT,
  cost NUMERIC,
  weight NUMERIC,
  notes TEXT,
  currency TEXT,
  country TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.sku_code,
    s.title,
    s.description,
    s.cost,
    s.weight,
    s.notes,
    s.currency,
    s.country,
    s.created_at,
    s.updated_at
  FROM public.sunsky_skus s
  WHERE s.user_id = user_id_param
  ORDER BY s.created_at DESC;
END;
$$;

-- Create a function to get all PO orders without limit
CREATE OR REPLACE FUNCTION get_all_po_orders(user_id_param UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  po_number TEXT,
  sku_code TEXT,
  quantity INTEGER,
  status TEXT,
  order_date TIMESTAMPTZ,
  expected_delivery TIMESTAMPTZ,
  notes TEXT,
  file_name TEXT,
  country TEXT,
  currency TEXT,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  sku_user_id UUID,
  supplier_order_number TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  sunsky_sku JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id,
    po.user_id,
    po.po_number,
    po.sku_code,
    po.quantity,
    po.status,
    po.order_date,
    po.expected_delivery,
    po.notes,
    po.file_name,
    po.country,
    po.currency,
    po.unit_cost,
    po.total_cost,
    po.sku_user_id,
    po.supplier_order_number,
    po.tracking_number,
    po.tracking_url,
    po.created_at,
    po.updated_at,
    CASE 
      WHEN s.id IS NOT NULL THEN
        jsonb_build_object(
          'id', s.id,
          'user_id', s.user_id,
          'sku_code', s.sku_code,
          'title', s.title,
          'description', s.description,
          'cost', s.cost,
          'weight', s.weight,
          'notes', s.notes,
          'currency', s.currency,
          'country', s.country,
          'created_at', s.created_at,
          'updated_at', s.updated_at
        )
      ELSE NULL
    END as sunsky_sku
  FROM public.po_orders po
  LEFT JOIN public.sunsky_skus s ON s.sku_code = po.sku_code AND s.user_id = po.user_id
  WHERE po.user_id = user_id_param
  ORDER BY po.created_at DESC;
END;
$$;