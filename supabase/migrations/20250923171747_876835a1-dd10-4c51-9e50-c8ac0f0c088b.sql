-- Check and fix RLS policies for product_images table

-- First, let's see if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'product_images';

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can manage their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can view their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can insert their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can update their own product images" ON product_images;
DROP POLICY IF EXISTS "Users can delete their own product images" ON product_images;

-- Enable RLS on product_images table
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for product_images
CREATE POLICY "Users can view their own product images" 
ON product_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product images" 
ON product_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product images" 
ON product_images 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product images" 
ON product_images 
FOR DELETE 
USING (auth.uid() = user_id);