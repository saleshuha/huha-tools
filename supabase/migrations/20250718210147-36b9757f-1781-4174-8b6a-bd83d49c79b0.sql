-- Add store_name column to payments table
ALTER TABLE public.payments 
ADD COLUMN store_name TEXT;