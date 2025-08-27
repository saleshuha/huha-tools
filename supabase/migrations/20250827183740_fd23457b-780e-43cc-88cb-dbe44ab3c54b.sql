-- Create background_tasks table for persistent task management
CREATE TABLE public.background_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'sunsky_export', 'po_processing', etc.
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  processed_items INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.background_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own background tasks" 
ON public.background_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own background tasks" 
ON public.background_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own background tasks" 
ON public.background_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own background tasks" 
ON public.background_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_background_tasks_updated_at
BEFORE UPDATE ON public.background_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for exports
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Create policies for export storage
CREATE POLICY "Users can view their own exports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "System can upload exports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'exports');

CREATE POLICY "System can update exports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'exports');

-- Create index for better performance
CREATE INDEX idx_background_tasks_user_status ON public.background_tasks(user_id, status);
CREATE INDEX idx_background_tasks_created_at ON public.background_tasks(created_at);