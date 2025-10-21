-- Create RLS policies for product-images storage bucket

-- Allow authenticated users to upload images (for edge function with service role)
CREATE POLICY "Allow service role to upload product images"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'product-images');

-- Allow public read access to product images
CREATE POLICY "Public read access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to read their own uploaded images
CREATE POLICY "Users can read product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');

-- Allow service role to update images
CREATE POLICY "Allow service role to update product images"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'product-images');

-- Allow service role to delete images
CREATE POLICY "Allow service role to delete product images"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'product-images');