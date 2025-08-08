-- Add missing external_id and external_id_type columns to po_orders table
ALTER TABLE public.po_orders 
ADD COLUMN external_id TEXT,
ADD COLUMN external_id_type TEXT;