-- Add is_printed column to po_orders table
ALTER TABLE public.po_orders 
ADD COLUMN is_printed boolean NOT NULL DEFAULT false;