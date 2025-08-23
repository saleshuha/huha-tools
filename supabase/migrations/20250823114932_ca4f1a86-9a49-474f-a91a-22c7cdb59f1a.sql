-- Add po_numbers field to sunsky_orders table to store related PO numbers
ALTER TABLE public.sunsky_orders 
ADD COLUMN po_numbers TEXT[] DEFAULT ARRAY[]::TEXT[];