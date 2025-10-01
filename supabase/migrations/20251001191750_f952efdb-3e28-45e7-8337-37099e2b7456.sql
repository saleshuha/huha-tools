-- Create velocity_quantity_overrides table to store manual quantity adjustments
CREATE TABLE IF NOT EXISTS public.velocity_quantity_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asin_id UUID NOT NULL,
  recommended_quantity INTEGER NOT NULL,
  system_recommendation INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, asin_id)
);

-- Enable RLS
ALTER TABLE public.velocity_quantity_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own overrides"
  ON public.velocity_quantity_overrides
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own overrides"
  ON public.velocity_quantity_overrides
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides"
  ON public.velocity_quantity_overrides
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides"
  ON public.velocity_quantity_overrides
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_velocity_quantity_overrides_updated_at
  BEFORE UPDATE ON public.velocity_quantity_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_velocity_quantity_overrides_user_asin 
  ON public.velocity_quantity_overrides(user_id, asin_id);