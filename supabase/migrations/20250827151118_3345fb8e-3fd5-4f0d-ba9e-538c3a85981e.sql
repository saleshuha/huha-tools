-- Create job_items table for tracking individual processing items
CREATE TABLE public.po_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.sunsky_import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  sku_code TEXT,
  product_data JSONB,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.po_job_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own job items" 
ON public.po_job_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job items" 
ON public.po_job_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job items" 
ON public.po_job_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job items" 
ON public.po_job_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_po_job_items_job_id ON public.po_job_items(job_id);
CREATE INDEX idx_po_job_items_user_id ON public.po_job_items(user_id);
CREATE INDEX idx_po_job_items_status ON public.po_job_items(status);
CREATE INDEX idx_po_job_items_job_id_status ON public.po_job_items(job_id, status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_po_job_items_updated_at
BEFORE UPDATE ON public.po_job_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();