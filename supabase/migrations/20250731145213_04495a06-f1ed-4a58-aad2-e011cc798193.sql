-- Remove pending_amount column and add payment_status column to carrefour_payments table
ALTER TABLE public.carrefour_payments 
DROP COLUMN IF EXISTS pending_amount;

-- Add payment_status column with default value
ALTER TABLE public.carrefour_payments 
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Pending';

-- Add constraint to ensure only valid payment status values
ALTER TABLE public.carrefour_payments 
ADD CONSTRAINT carrefour_payments_payment_status_check 
CHECK (payment_status IN ('Pending', 'Received'));