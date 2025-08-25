-- Create label templates table
CREATE TABLE public.label_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  canvas_data JSONB NOT NULL DEFAULT '{}',
  width INTEGER NOT NULL DEFAULT 400,
  height INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for label templates
CREATE POLICY "Users can view their own templates" 
ON public.label_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.label_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.label_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.label_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create label datasets table for bulk data
CREATE TABLE public.label_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '[]',
  headers JSONB NOT NULL DEFAULT '[]',
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.label_datasets ENABLE ROW LEVEL SECURITY;

-- Create policies for label datasets
CREATE POLICY "Users can view their own datasets" 
ON public.label_datasets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own datasets" 
ON public.label_datasets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets" 
ON public.label_datasets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets" 
ON public.label_datasets 
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

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_label_templates_updated_at
  BEFORE UPDATE ON public.label_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_label_datasets_updated_at
  BEFORE UPDATE ON public.label_datasets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();