-- Create sunsky_import_jobs table for background import tasks
CREATE TABLE public.sunsky_import_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  criteria jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  total_items integer,
  processed_items integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  country text NOT NULL DEFAULT 'UAE',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  last_error text
);

-- Enable Row Level Security
ALTER TABLE public.sunsky_import_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own import jobs" 
ON public.sunsky_import_jobs 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sunsky_import_jobs_updated_at
BEFORE UPDATE ON public.sunsky_import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();