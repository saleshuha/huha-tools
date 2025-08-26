-- Create table for storing all imported orders (both matched and unmatched)
CREATE TABLE public.order_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  order_status text,
  warehouse_code text,
  order_place_date text,
  required_ship_date text,
  ship_method text,
  ship_method_code text,
  ship_to_name text,
  ship_to_address_line1 text,
  ship_to_address_line2 text,
  ship_to_address_line3 text,
  ship_to_city text,
  ship_to_state text,
  ship_to_zip_code text,
  ship_to_country text,
  phone_number text,
  is_gift text,
  item_cost text,
  sku text,
  asin text,
  item_title text,
  item_quantity integer NOT NULL DEFAULT 1,
  gift_message text,
  tracking_id text,
  shipped_date text,
  
  -- Additional fields for processing tracking
  has_inventory_match boolean NOT NULL DEFAULT false,
  inventory_match_type text, -- 'asin' or 'sku'
  match_field_type text, -- 'asin' or 'sku' (what field was used to match)
  inventory_id uuid,
  is_processed boolean NOT NULL DEFAULT false,
  processed_at timestamp with time zone,
  source_file text NOT NULL,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_imports ENABLE ROW LEVEL SECURITY;

-- Create policies for order_imports
CREATE POLICY "Users can create their own order imports" 
ON public.order_imports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own order imports" 
ON public.order_imports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own order imports" 
ON public.order_imports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own order imports" 
ON public.order_imports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_order_imports_user_id ON public.order_imports(user_id);
CREATE INDEX idx_order_imports_order_id ON public.order_imports(order_id);
CREATE INDEX idx_order_imports_asin ON public.order_imports(asin);
CREATE INDEX idx_order_imports_sku ON public.order_imports(sku);
CREATE INDEX idx_order_imports_has_match ON public.order_imports(has_inventory_match);
CREATE INDEX idx_order_imports_is_processed ON public.order_imports(is_processed);
CREATE INDEX idx_order_imports_created_at ON public.order_imports(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_order_imports_updated_at
  BEFORE UPDATE ON public.order_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();