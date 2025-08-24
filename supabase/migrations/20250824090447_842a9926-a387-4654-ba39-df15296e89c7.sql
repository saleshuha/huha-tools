-- Add sunsky_credentials_id to po_orders table
ALTER TABLE public.po_orders 
ADD COLUMN sunsky_credentials_id uuid REFERENCES public.sunsky_credentials(id) ON DELETE SET NULL;

-- Add sunsky_credentials_id to sunsky_orders table  
ALTER TABLE public.sunsky_orders
ADD COLUMN sunsky_credentials_id uuid REFERENCES public.sunsky_credentials(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_po_orders_sunsky_credentials_id ON public.po_orders(sunsky_credentials_id);
CREATE INDEX idx_sunsky_orders_sunsky_credentials_id ON public.sunsky_orders(sunsky_credentials_id);
CREATE INDEX idx_po_orders_supplier_order_number ON public.po_orders(supplier_order_number) WHERE supplier_order_number IS NOT NULL;

-- Backfill sunsky_orders.sunsky_credentials_id from linked po_orders
UPDATE public.sunsky_orders so
SET sunsky_credentials_id = po.sunsky_credentials_id
FROM public.po_orders po 
WHERE po.supplier_order_number = so.number 
AND po.sunsky_credentials_id IS NOT NULL
AND so.sunsky_credentials_id IS NULL;