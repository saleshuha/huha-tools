-- Create sunsky_product_images table for storing downloaded product images
CREATE TABLE IF NOT EXISTS public.sunsky_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_no TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL DEFAULT 0,
  image_type TEXT NOT NULL DEFAULT 'detail',
  storage_path TEXT,
  download_status TEXT NOT NULL DEFAULT 'pending',
  download_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_item_image UNIQUE (user_id, item_no, image_order)
);

-- Add RLS policies
ALTER TABLE public.sunsky_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own product images"
  ON public.sunsky_product_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own product images"
  ON public.sunsky_product_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product images"
  ON public.sunsky_product_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product images"
  ON public.sunsky_product_images FOR DELETE
  USING (auth.uid() = user_id);

-- Add columns to sunsky_skus table for image tracking
ALTER TABLE public.sunsky_skus
  ADD COLUMN IF NOT EXISTS images_downloaded BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS images_download_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sunsky_product_images_user_item 
  ON public.sunsky_product_images(user_id, item_no);

CREATE INDEX IF NOT EXISTS idx_sunsky_product_images_status 
  ON public.sunsky_product_images(user_id, download_status);

-- Create storage bucket for sunsky images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sunsky-images', 'sunsky-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their sunsky images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sunsky-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their sunsky images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sunsky-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view public sunsky images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sunsky-images');

CREATE POLICY "Users can delete their sunsky images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sunsky-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );