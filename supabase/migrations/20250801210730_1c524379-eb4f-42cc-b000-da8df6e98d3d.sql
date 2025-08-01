-- Create table for payment reports
CREATE TABLE public.payment_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_period_start DATE,
  report_period_end DATE,
  report_month TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'UAE',
  
  -- Financial data fields
  gross_amount NUMERIC,
  fees NUMERIC,
  tax NUMERIC,
  net_amount NUMERIC,
  commission NUMERIC,
  refunds NUMERIC,
  adjustments NUMERIC,
  
  -- Reference fields
  transaction_id TEXT,
  order_id TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  currency TEXT DEFAULT 'AED',
  description TEXT,
  
  -- Metadata
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payment reports" 
ON public.payment_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment reports" 
ON public.payment_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment reports" 
ON public.payment_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment reports" 
ON public.payment_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key to stores
ALTER TABLE public.payment_reports 
ADD CONSTRAINT fk_payment_reports_store 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_reports_updated_at
BEFORE UPDATE ON public.payment_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();