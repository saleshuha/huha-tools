-- Fix security warnings by setting search_path for all functions

-- Update the newly created function
CREATE OR REPLACE FUNCTION public.update_status_based_on_quantity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If quantity is 0, set status to 'sold'
  IF NEW.quantity = 0 THEN
    NEW.status = 'sold';
    -- Set date_sold if it's not already set
    IF NEW.date_sold IS NULL THEN
      NEW.date_sold = now();
    END IF;
  -- If quantity is greater than 0, set status to 'in-stock'  
  ELSIF NEW.quantity > 0 THEN
    NEW.status = 'in-stock';
    -- Clear date_sold when back in stock
    NEW.date_sold = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update other functions to fix search path security warnings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, country, role, is_main_admin)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'country', 'UAE'),
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 
      THEN 'admin' 
      ELSE 'user' 
    END,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 
      THEN TRUE 
      ELSE FALSE 
    END
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_items_needing_restock()
RETURNS TABLE(table_name text, item_id uuid, identifier text, current_quantity integer, days_since_last_restock integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'asin_inventory'::text as table_name,
    ai.id as item_id,
    (ai.asin || ' (' || ai.serial_number || ')')::text as identifier,
    ai.quantity as current_quantity,
    CASE 
      WHEN ai.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - ai.last_restock_date)::integer
    END as days_since_last_restock
  FROM public.asin_inventory ai
  WHERE ai.quantity <= 5  -- Default threshold of 5
    AND ai.status = 'in-stock'
  
  UNION ALL
  
  SELECT 
    'sku_inventory'::text as table_name,
    si.id as item_id,
    (si.sku_number || ' (' || si.bin_serial_number || ')')::text as identifier,
    si.quantity as current_quantity,
    CASE 
      WHEN si.last_restock_date IS NULL THEN NULL
      ELSE EXTRACT(days FROM now() - si.last_restock_date)::integer
    END as days_since_last_restock
  FROM public.sku_inventory si
  WHERE si.quantity <= 5  -- Default threshold of 5
    AND si.status = 'in-stock'
  
  ORDER BY current_quantity ASC, days_since_last_restock DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_analytics(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now())
RETURNS TABLE(product_type text, total_sold integer, avg_days_to_sell numeric, fastest_selling_item text, slowest_selling_item text, restock_frequency_days numeric, predicted_restock_needed_items jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  asin_analytics RECORD;
  sku_analytics RECORD;
BEGIN
  -- ASIN Analytics
  SELECT 
    COUNT(*) as total_sold,
    AVG(EXTRACT(days FROM date_sold - date_added)) as avg_days,
    (SELECT asin FROM asin_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) ASC LIMIT 1) as fastest,
    (SELECT asin FROM asin_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) DESC LIMIT 1) as slowest,
    AVG(EXTRACT(days FROM last_restock_date - date_added)) as restock_freq
  INTO asin_analytics
  FROM asin_inventory 
  WHERE date_sold BETWEEN start_date AND end_date
    AND date_sold IS NOT NULL;

  -- SKU Analytics  
  SELECT 
    COUNT(*) as total_sold,
    AVG(EXTRACT(days FROM date_sold - date_added)) as avg_days,
    (SELECT sku_number FROM sku_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) ASC LIMIT 1) as fastest,
    (SELECT sku_number FROM sku_inventory WHERE date_sold BETWEEN start_date AND end_date 
     AND date_sold IS NOT NULL
     ORDER BY (date_sold - date_added) DESC LIMIT 1) as slowest,
    AVG(EXTRACT(days FROM last_restock_date - date_added)) as restock_freq
  INTO sku_analytics
  FROM sku_inventory 
  WHERE date_sold BETWEEN start_date AND end_date
    AND date_sold IS NOT NULL;

  -- Return ASIN results
  product_type := 'ASIN';
  total_sold := COALESCE(asin_analytics.total_sold, 0);
  avg_days_to_sell := COALESCE(asin_analytics.avg_days, 0);
  fastest_selling_item := COALESCE(asin_analytics.fastest, 'N/A');
  slowest_selling_item := COALESCE(asin_analytics.slowest, 'N/A');
  restock_frequency_days := COALESCE(asin_analytics.restock_freq, 0);
  predicted_restock_needed_items := (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 
      'asin', asin, 
      'predicted_days', GREATEST(1, COALESCE(asin_analytics.avg_days, 7))
    )), '[]'::jsonb)
    FROM asin_inventory 
    WHERE quantity <= 5 AND status = 'in-stock'  -- Default threshold of 5
  );
  RETURN NEXT;

  -- Return SKU results
  product_type := 'SKU';
  total_sold := COALESCE(sku_analytics.total_sold, 0);
  avg_days_to_sell := COALESCE(sku_analytics.avg_days, 0);
  fastest_selling_item := COALESCE(sku_analytics.fastest, 'N/A');
  slowest_selling_item := COALESCE(sku_analytics.slowest, 'N/A');
  restock_frequency_days := COALESCE(sku_analytics.restock_freq, 0);
  predicted_restock_needed_items := (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 
      'sku', sku_number, 
      'predicted_days', GREATEST(1, COALESCE(sku_analytics.avg_days, 7))
    )), '[]'::jsonb)
    FROM sku_inventory 
    WHERE quantity <= 5 AND status = 'in-stock'  -- Default threshold of 5
  );
  RETURN NEXT;
END;
$$;