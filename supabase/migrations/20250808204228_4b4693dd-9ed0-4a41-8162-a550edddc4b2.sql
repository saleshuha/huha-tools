-- Add new mandatory columns to po_orders table
ALTER TABLE public.po_orders 
ADD COLUMN IF NOT EXISTS ship_to_location text,
ADD COLUMN IF NOT EXISTS asin text,
ADD COLUMN IF NOT EXISTS model_number text,
ADD COLUMN IF NOT EXISTS title text;

-- Update the table to make certain fields not nullable for new records
-- We'll handle this with validation in the application since we can't change existing nullable fields