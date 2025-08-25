-- Create table for Sunsky export history
CREATE TABLE public.sunsky_export_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL DEFAULT 'products',
  status TEXT NOT NULL DEFAULT 'pending',
  filters JSONB NOT NULL DEFAULT '{}',
  total_estimated INTEGER DEFAULT 0,
  total_actual INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  file_name TEXT,
  file_size BIGINT,
  error_message TEXT,
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sunsky_export_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own export history" 
ON public.sunsky_export_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own export history" 
ON public.sunsky_export_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own export history" 
ON public.sunsky_export_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own export history" 
ON public.sunsky_export_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sunsky_export_history_updated_at
  BEFORE UPDATE ON public.sunsky_export_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();