-- Fix all existing functions with missing search_path
CREATE OR REPLACE FUNCTION public.update_po_currency()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';