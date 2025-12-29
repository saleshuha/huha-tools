-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own barcodes" ON public.product_barcodes;

-- Create a more permissive INSERT policy that allows:
-- 1. Authenticated users inserting their own barcodes (auth.uid() = user_id)
-- 2. Anonymous users inserting barcodes for valid purchase link owners
CREATE POLICY "Users can create barcodes for themselves or via purchase links"
ON public.product_barcodes
FOR INSERT
WITH CHECK (
  -- Either the user is authenticated and inserting their own barcode
  (auth.uid() = user_id)
  OR
  -- Or the user_id corresponds to a valid purchase link owner
  EXISTS (
    SELECT 1 FROM public.purchase_links pl
    WHERE pl.user_id = product_barcodes.user_id
    AND pl.is_active = true
  )
);