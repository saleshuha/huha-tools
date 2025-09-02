-- Remove any unique constraint on purchase_item_nr if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%purchase_item_nr%') THEN
        ALTER TABLE public.noon_orders DROP CONSTRAINT IF EXISTS noon_orders_purchase_item_nr_key;
    END IF;
END $$;

-- Create unique constraint on combination of order_nr + purchase_item_nr + user_id for uniqueness
ALTER TABLE public.noon_orders 
ADD CONSTRAINT noon_orders_unique_order_item_user 
UNIQUE (order_nr, purchase_item_nr, user_id);

-- Create stores table for noon stores management
CREATE TABLE IF NOT EXISTS public.noon_stores_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UAE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on noon_stores_config
ALTER TABLE public.noon_stores_config ENABLE ROW LEVEL SECURITY;

-- Create policies for noon_stores_config
CREATE POLICY "Users can view their own store configs" 
ON public.noon_stores_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own store configs" 
ON public.noon_stores_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store configs" 
ON public.noon_stores_config 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store configs" 
ON public.noon_stores_config 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update noon_orders to reference the new stores config
ALTER TABLE public.noon_orders 
ADD COLUMN IF NOT EXISTS selected_store_id UUID REFERENCES public.noon_stores_config(id) ON DELETE SET NULL;