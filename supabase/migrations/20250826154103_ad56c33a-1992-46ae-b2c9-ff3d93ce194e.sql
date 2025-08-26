-- Fix SECURITY DEFINER functions to have immutable search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix other SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.update_po_currency()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_country text;
BEGIN
  -- Get user's country from profiles table
  SELECT country INTO user_country 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Set country and currency based on user's profile country
  IF user_country IS NOT NULL THEN
    NEW.country = user_country;
    IF user_country = 'UAE' THEN
      NEW.currency = 'AED';
    ELSIF user_country = 'KSA' THEN
      NEW.currency = 'SAR';
    ELSE
      NEW.currency = 'AED'; -- Default to AED
    END IF;
  ELSE
    -- Default values if user profile not found
    NEW.country = 'UAE';
    NEW.currency = 'AED';
  END IF;
  
  -- Set sku_user_id to match user_id for foreign key
  NEW.sku_user_id = NEW.user_id;
  
  -- Update total_cost if unit_cost and quantity are set
  IF NEW.unit_cost IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.total_cost = NEW.unit_cost * NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_status_based_on_quantity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If quantity is 0 and status is not already 'ordered', set status to 'sold'
  IF NEW.quantity = 0 AND NEW.status != 'ordered' THEN
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
$function$;