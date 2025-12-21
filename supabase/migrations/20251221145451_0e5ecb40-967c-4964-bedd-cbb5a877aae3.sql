-- Create inventory_match_sessions table
CREATE TABLE public.inventory_match_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_name TEXT NOT NULL,
  file_name TEXT,
  total_items INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  in_stock_count INTEGER DEFAULT 0,
  partial_stock_count INTEGER DEFAULT 0,
  out_of_stock_count INTEGER DEFAULT 0,
  match_results JSONB DEFAULT '[]'::jsonb,
  country TEXT DEFAULT 'UAE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.inventory_match_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own match sessions" 
ON public.inventory_match_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own match sessions" 
ON public.inventory_match_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own match sessions" 
ON public.inventory_match_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own match sessions" 
ON public.inventory_match_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_match_sessions_updated_at
BEFORE UPDATE ON public.inventory_match_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();