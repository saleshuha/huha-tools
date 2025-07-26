-- Update RLS policies to allow users to view data from any country they select
-- This allows admins and users to switch between countries to view different country data

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their country ASIN inventory" ON public.asin_inventory;
DROP POLICY IF EXISTS "Users can view their country SKU inventory" ON public.sku_inventory;

-- Create new SELECT policies that allow viewing data from any country for authenticated users
CREATE POLICY "Users can view ASIN inventory from any country" 
ON public.asin_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view SKU inventory from any country" 
ON public.sku_inventory 
FOR SELECT 
USING (auth.uid() = user_id);