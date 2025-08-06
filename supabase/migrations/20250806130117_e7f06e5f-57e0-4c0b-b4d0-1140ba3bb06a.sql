-- Fix security issues by updating functions with proper search_path

-- Update the update_po_currency function
CREATE OR REPLACE FUNCTION update_po_currency()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Update the set_sunsky_sku_currency function
CREATE OR REPLACE FUNCTION set_sunsky_sku_currency()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_country text;
BEGIN
  -- Get user's country from profiles table
  SELECT country INTO user_country 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Set currency based on user's country
  IF user_country = 'UAE' THEN
    NEW.currency = 'AED';
  ELSIF user_country = 'KSA' THEN
    NEW.currency = 'SAR';
  ELSE
    NEW.currency = 'AED'; -- Default to AED
  END IF;
  
  RETURN NEW;
END;
$$;