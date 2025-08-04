-- Drop the existing table and create a new, better structured one
DROP TABLE IF EXISTS public.order_processing_results;

-- Create a new processed_orders table with proper structure
CREATE TABLE public.processed_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  asin TEXT,
  sku TEXT,
  item_title TEXT,
  quantity_processed INTEGER NOT NULL DEFAULT 1,
  inventory_type TEXT NOT NULL CHECK (inventory_type IN ('asin', 'sku')),
  match_type TEXT NOT NULL CHECK (match_type IN ('asin', 'sku')),
  inventory_id UUID,
  previous_stock INTEGER,
  new_stock INTEGER,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_file TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own processed orders" 
ON public.processed_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own processed orders" 
ON public.processed_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processed orders" 
ON public.processed_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processed orders" 
ON public.processed_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_processed_orders_user_id ON public.processed_orders(user_id);
CREATE INDEX idx_processed_orders_processed_at ON public.processed_orders(processed_at DESC);
CREATE INDEX idx_processed_orders_order_number ON public.processed_orders(order_number);

-- Create trigger for updating updated_at
CREATE TRIGGER update_processed_orders_updated_at
BEFORE UPDATE ON public.processed_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();