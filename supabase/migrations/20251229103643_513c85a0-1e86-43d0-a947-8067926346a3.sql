-- Create product_barcodes table for storing barcode-to-product mappings
CREATE TABLE public.product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL,
  barcode_type TEXT, -- 'EAN13', 'UPC', 'CODE128', 'QR', etc.
  asin TEXT,
  sku_code TEXT,
  model_number TEXT,
  title TEXT,
  po_order_id UUID REFERENCES public.po_orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(barcode, user_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_product_barcodes_barcode ON public.product_barcodes(barcode);
CREATE INDEX idx_product_barcodes_sku ON public.product_barcodes(sku_code);
CREATE INDEX idx_product_barcodes_asin ON public.product_barcodes(asin);
CREATE INDEX idx_product_barcodes_user ON public.product_barcodes(user_id);
CREATE INDEX idx_product_barcodes_po_order ON public.product_barcodes(po_order_id);

-- Enable RLS
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own barcodes" 
ON public.product_barcodes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own barcodes" 
ON public.product_barcodes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own barcodes" 
ON public.product_barcodes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own barcodes" 
ON public.product_barcodes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow anonymous users to read barcodes for purchase link pages (they need to see linked barcodes)
CREATE POLICY "Anonymous can view barcodes for purchase links"
ON public.product_barcodes
FOR SELECT
USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_product_barcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_product_barcodes_updated_at
BEFORE UPDATE ON public.product_barcodes
FOR EACH ROW
EXECUTE FUNCTION public.update_product_barcodes_updated_at();