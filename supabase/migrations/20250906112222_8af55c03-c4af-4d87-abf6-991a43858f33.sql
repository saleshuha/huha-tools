-- Add unique constraint for order_nr and purchase_item_nr combination
-- This ensures no duplicate orders but allows matching on both fields
ALTER TABLE public.noon_processing_orders 
ADD CONSTRAINT unique_order_item_combo UNIQUE (user_id, order_nr, purchase_item_nr);

-- Add file upload date to track when file was uploaded
ALTER TABLE public.noon_processing_orders 
ADD COLUMN file_upload_date timestamp with time zone DEFAULT now();

-- Add order_received_at field to show in preview
-- This field already exists, but let's ensure it's properly indexed for performance
CREATE INDEX IF NOT EXISTS idx_noon_processing_orders_order_received_at 
ON public.noon_processing_orders(order_received_at);