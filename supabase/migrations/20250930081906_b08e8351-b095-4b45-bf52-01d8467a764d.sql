
-- Create table for non-source items (items not available on Sunsky)
CREATE TABLE IF NOT EXISTS public.non_source_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asin text,
  sku text,
  title text,
  serial_number text,
  country text NOT NULL DEFAULT 'UAE',
  reason text,
  marked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.non_source_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own non-source items"
ON public.non_source_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own non-source items"
ON public.non_source_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-source items"
ON public.non_source_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-source items"
ON public.non_source_items
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_non_source_items_user_country ON public.non_source_items(user_id, country);
CREATE INDEX IF NOT EXISTS idx_non_source_items_sku ON public.non_source_items(user_id, sku);
CREATE INDEX IF NOT EXISTS idx_non_source_items_asin ON public.non_source_items(user_id, asin);
