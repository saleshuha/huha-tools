-- Remove sku_number column and add status column to carrefour_payments table
ALTER TABLE public.carrefour_payments 
DROP COLUMN IF EXISTS sku_number;

-- Add status column with default value
ALTER TABLE public.carrefour_payments 
ADD COLUMN status TEXT NOT NULL DEFAULT 'Delivered';

-- Add constraint to ensure only valid status values
ALTER TABLE public.carrefour_payments 
ADD CONSTRAINT carrefour_payments_status_check 
CHECK (status IN ('Delivered', 'Returned', 'Cancelled', 'Other'));