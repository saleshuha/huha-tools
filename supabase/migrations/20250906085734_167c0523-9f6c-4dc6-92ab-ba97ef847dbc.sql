-- Add missing date columns to sunsky_orders table
ALTER TABLE public.sunsky_orders 
ADD COLUMN IF NOT EXISTS gmt_paid TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gmt_shipped TIMESTAMP WITH TIME ZONE;