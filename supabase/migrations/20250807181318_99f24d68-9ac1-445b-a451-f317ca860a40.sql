-- Add shipping_rate column to profiles table for persistent shipping rate storage
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS shipping_rate NUMERIC DEFAULT 0.005;

-- Add comment to describe the column
COMMENT ON COLUMN public.profiles.shipping_rate IS 'Default shipping rate per gram for PO calculations';