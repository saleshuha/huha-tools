-- Add supplier order number and tracking information columns to po_orders table
ALTER TABLE public.po_orders 
ADD COLUMN supplier_order_number text,
ADD COLUMN tracking_number text,
ADD COLUMN tracking_url text;