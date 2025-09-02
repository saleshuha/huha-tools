-- Fix the noon_orders table column name issue
-- The upload is failing because the code expects 'user' but the column is 'shipment_user'
-- Let's standardize and add store support

-- Add store_id column to noon_orders table
ALTER TABLE public.noon_orders 
ADD COLUMN store_id uuid REFERENCES public.stores(id);

-- Add index for better performance
CREATE INDEX idx_noon_orders_store_id ON public.noon_orders(store_id);
CREATE INDEX idx_noon_orders_user_country ON public.noon_orders(user_id, order_country_code);