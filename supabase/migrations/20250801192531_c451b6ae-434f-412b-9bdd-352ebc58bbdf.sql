-- Create table for Noon order fees data
CREATE TABLE public.noon_order_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_month TEXT NOT NULL, -- Format: YYYY-MM
  report_period_start DATE,
  report_period_end DATE,
  
  -- Order details
  id_partner TEXT,
  marketplace TEXT,
  order_nr TEXT NOT NULL,
  item_nr TEXT,
  partner_sales_nr TEXT,
  awb_nr TEXT,
  sku TEXT,
  partner_sku TEXT,
  fulfillment_mode TEXT,
  family TEXT,
  product_type TEXT,
  brand TEXT,
  product_title TEXT,
  item_status TEXT,
  country_code TEXT NOT NULL DEFAULT 'UAE',
  
  -- Dates
  last_statement_date TIMESTAMP WITH TIME ZONE,
  ordered_date TIMESTAMP WITH TIME ZONE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  returned_date TIMESTAMP WITH TIME ZONE,
  
  -- Currency and pricing
  currency_code TEXT,
  seller_price NUMERIC,
  seller_promo NUMERIC,
  base_price NUMERIC,
  promo_deal NUMERIC,
  noon_markup NUMERIC,
  offer_price NUMERIC,
  promo_coupon NUMERIC,
  invoice_price NUMERIC,
  
  -- Fees
  fee_noon_promo NUMERIC,
  fee_noon_markup NUMERIC,
  fee_referral NUMERIC,
  fee_noon_rocket_referral NUMERIC,
  fee_outbound_fbn NUMERIC,
  fee_weight_handling NUMERIC,
  fee_crossdock NUMERIC,
  fee_directship_outbound NUMERIC,
  fee_shipping NUMERIC,
  fee_damaged_return NUMERIC,
  fee_noon_penalty NUMERIC,
  fee_item_cancellation NUMERIC,
  fee_warranty_penalty NUMERIC,
  fee_retention_penalty NUMERIC,
  fee_alternate_seller_fulfillment NUMERIC,
  fee_miscellaneous NUMERIC,
  fee_direct_collection NUMERIC,
  fee_reinvoicing NUMERIC,
  total_payment NUMERIC,
  
  -- Statement details
  statement_nr TEXT,
  invoice_nr TEXT,
  creditnote_nr TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.noon_order_fees ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own noon order fees" 
ON public.noon_order_fees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own noon order fees" 
ON public.noon_order_fees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own noon order fees" 
ON public.noon_order_fees 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own noon order fees" 
ON public.noon_order_fees 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_noon_order_fees_updated_at
BEFORE UPDATE ON public.noon_order_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_noon_order_fees_user_country ON public.noon_order_fees(user_id, country_code);
CREATE INDEX idx_noon_order_fees_store_month ON public.noon_order_fees(store_id, report_month);
CREATE INDEX idx_noon_order_fees_sku ON public.noon_order_fees(sku);
CREATE INDEX idx_noon_order_fees_order_nr ON public.noon_order_fees(order_nr);