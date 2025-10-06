-- Create amazon_returns_data table
CREATE TABLE public.amazon_returns_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  country TEXT NOT NULL DEFAULT 'UAE',
  asin TEXT NOT NULL,
  product_title TEXT,
  shipped_units INTEGER NOT NULL,
  returned_units INTEGER NOT NULL,
  return_ratio NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN shipped_units > 0 THEN (returned_units::NUMERIC / shipped_units::NUMERIC * 100)
      ELSE 0
    END
  ) STORED,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_amazon_returns_user_country ON public.amazon_returns_data(user_id, country);
CREATE INDEX idx_amazon_returns_asin ON public.amazon_returns_data(asin);
CREATE INDEX idx_amazon_returns_ratio ON public.amazon_returns_data(return_ratio);
CREATE INDEX idx_amazon_returns_upload_date ON public.amazon_returns_data(upload_date);

-- Enable Row Level Security
ALTER TABLE public.amazon_returns_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own amazon returns data"
  ON public.amazon_returns_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own amazon returns data"
  ON public.amazon_returns_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own amazon returns data"
  ON public.amazon_returns_data
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own amazon returns data"
  ON public.amazon_returns_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_amazon_returns_data_updated_at
  BEFORE UPDATE ON public.amazon_returns_data
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();