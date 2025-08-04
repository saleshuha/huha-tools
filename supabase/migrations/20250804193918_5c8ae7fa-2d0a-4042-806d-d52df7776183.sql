-- Create table for order processing results
CREATE TABLE public.order_processing_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  asin TEXT,
  sku TEXT,
  item_title TEXT,
  order_quantity INTEGER NOT NULL,
  inventory_type TEXT, -- 'asin' or 'sku'
  match_type TEXT, -- 'asin' or 'sku'
  inventory_id UUID,
  inventory_status TEXT NOT NULL, -- 'found' or 'not_found'
  current_stock INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_quantity INTEGER,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.order_processing_results ENABLE ROW LEVEL SECURITY;

-- Create policies for order processing results
CREATE POLICY "Users can view their own order processing results" 
ON public.order_processing_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own order processing results" 
ON public.order_processing_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own order processing results" 
ON public.order_processing_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own order processing results" 
ON public.order_processing_results 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_order_processing_results_updated_at
BEFORE UPDATE ON public.order_processing_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_order_processing_results_user_id ON public.order_processing_results(user_id);
CREATE INDEX idx_order_processing_results_order_id ON public.order_processing_results(order_id);
CREATE INDEX idx_order_processing_results_processed ON public.order_processing_results(processed);
CREATE INDEX idx_order_processing_results_inventory_status ON public.order_processing_results(inventory_status);