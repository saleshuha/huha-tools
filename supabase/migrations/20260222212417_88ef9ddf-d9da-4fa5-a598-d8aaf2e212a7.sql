
CREATE OR REPLACE FUNCTION public.get_suppliers_for_user(p_user_id uuid)
RETURNS TABLE(id uuid, supplier_name text) 
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT s.id, s.supplier_name
  FROM public.suppliers s
  WHERE s.user_id = p_user_id AND s.is_active = true
  ORDER BY s.supplier_name;
$$;
