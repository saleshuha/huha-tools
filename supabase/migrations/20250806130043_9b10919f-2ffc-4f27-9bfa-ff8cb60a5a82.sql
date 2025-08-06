-- Create unique constraint on sku_code in sunsky_skus table
ALTER TABLE sunsky_skus 
ADD CONSTRAINT unique_sunsky_sku_code_per_user 
UNIQUE (user_id, sku_code);

-- Now add foreign key relationship between po_orders and sunsky_skus
-- We need to create a composite foreign key since we have user_id + sku_code
ALTER TABLE po_orders 
ADD COLUMN sku_user_id uuid;

-- Update existing po_orders to set the sku_user_id to the current user_id
UPDATE po_orders 
SET sku_user_id = user_id;

-- Make sku_user_id not null
ALTER TABLE po_orders 
ALTER COLUMN sku_user_id SET NOT NULL;

-- Add composite foreign key constraint
ALTER TABLE po_orders 
ADD CONSTRAINT fk_po_orders_sunsky_skus 
FOREIGN KEY (sku_user_id, sku_code) REFERENCES sunsky_skus(user_id, sku_code);

-- Add currency column to po_orders table for country-specific currency
ALTER TABLE po_orders 
ADD COLUMN currency text DEFAULT 'AED';

-- Add country column to po_orders table
ALTER TABLE po_orders 
ADD COLUMN country text DEFAULT 'UAE';

-- Add cost column to po_orders table to track order cost
ALTER TABLE po_orders 
ADD COLUMN unit_cost numeric;

-- Add total_cost column calculated from quantity * unit_cost
ALTER TABLE po_orders 
ADD COLUMN total_cost numeric;

-- Create function to update currency based on country and user profile
CREATE OR REPLACE FUNCTION update_po_currency()
RETURNS TRIGGER AS $$
DECLARE
  user_country text;
BEGIN
  -- Get user's country from profiles table
  SELECT country INTO user_country 
  FROM profiles 
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update currency and total cost
CREATE TRIGGER trigger_update_po_currency
BEFORE INSERT OR UPDATE ON po_orders
FOR EACH ROW
EXECUTE FUNCTION update_po_currency();

-- Add currency column to sunsky_skus table
ALTER TABLE sunsky_skus 
ADD COLUMN currency text DEFAULT 'AED';

-- Create function to set sunsky_sku currency based on user country
CREATE OR REPLACE FUNCTION set_sunsky_sku_currency()
RETURNS TRIGGER AS $$
DECLARE
  user_country text;
BEGIN
  -- Get user's country from profiles table
  SELECT country INTO user_country 
  FROM profiles 
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
$$ LANGUAGE plpgsql;

-- Create trigger for sunsky_skus currency
CREATE TRIGGER trigger_set_sunsky_sku_currency
BEFORE INSERT OR UPDATE ON sunsky_skus
FOR EACH ROW
EXECUTE FUNCTION set_sunsky_sku_currency();