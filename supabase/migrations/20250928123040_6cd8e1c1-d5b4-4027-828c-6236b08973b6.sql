-- Create export mode preferences table
CREATE TABLE public.export_mode_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_type text NOT NULL DEFAULT 'asin_inventory',
  export_mode text NOT NULL CHECK (export_mode IN ('global', 'local')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable Row Level Security
ALTER TABLE public.export_mode_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own export preferences" 
ON public.export_mode_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export preferences" 
ON public.export_mode_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export preferences" 
ON public.export_mode_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own export preferences" 
ON public.export_mode_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_export_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_export_preferences_updated_at
  BEFORE UPDATE ON public.export_mode_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_export_preferences_updated_at();