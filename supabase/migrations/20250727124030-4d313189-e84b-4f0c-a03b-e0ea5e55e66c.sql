-- Update the trigger function to respect 'ordered' status
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