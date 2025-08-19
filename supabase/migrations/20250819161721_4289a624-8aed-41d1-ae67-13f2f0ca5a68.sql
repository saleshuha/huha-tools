-- Create missing tables for Sunsky import job management

-- Table for tracking individual job items
CREATE TABLE public.sunsky_import_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.sunsky_import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  item_no TEXT NOT NULL,
  sku_code TEXT,
  title TEXT,
  cost NUMERIC,
  weight NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error', 'skipped')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for job logs
CREATE TABLE public.sunsky_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.sunsky_import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status column to import jobs for better control
ALTER TABLE public.sunsky_import_jobs 
ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE public.sunsky_import_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sunsky_import_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for job items
CREATE POLICY "Users can manage their own job items" 
ON public.sunsky_import_job_items 
FOR ALL 
USING (user_id = auth.uid());

-- Create policies for logs
CREATE POLICY "Users can view their own job logs" 
ON public.sunsky_import_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can create job logs" 
ON public.sunsky_import_logs 
FOR INSERT 
WITH CHECK (true); -- Allow system to create logs

-- Create indexes for performance
CREATE INDEX idx_sunsky_import_job_items_job_id ON public.sunsky_import_job_items(job_id);
CREATE INDEX idx_sunsky_import_job_items_user_id ON public.sunsky_import_job_items(user_id);
CREATE INDEX idx_sunsky_import_job_items_status ON public.sunsky_import_job_items(status);

CREATE INDEX idx_sunsky_import_logs_job_id ON public.sunsky_import_logs(job_id);
CREATE INDEX idx_sunsky_import_logs_user_id ON public.sunsky_import_logs(user_id);
CREATE INDEX idx_sunsky_import_logs_level ON public.sunsky_import_logs(level);

-- Create triggers for updated_at
CREATE TRIGGER update_sunsky_import_job_items_updated_at
BEFORE UPDATE ON public.sunsky_import_job_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();