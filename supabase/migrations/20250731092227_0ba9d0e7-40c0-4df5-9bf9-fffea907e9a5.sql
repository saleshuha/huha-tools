-- Create tables for Noon payment reconciliation

-- Table to store file headers permanently
CREATE TABLE public.noon_file_headers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('invoice', 'credit')),
  headers TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store invoice report data
CREATE TABLE public.noon_invoice_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Document information
  contract TEXT,
  business_unit TEXT,
  document_type TEXT,
  invoice_type_code TEXT,
  document_subtype TEXT,
  document_date TIMESTAMP WITH TIME ZONE,
  invoice_nr TEXT,
  invoice_line_nr TEXT,
  credit_note_nr TEXT,
  credit_note_line_nr TEXT,
  transaction_type TEXT,
  source_doc_type TEXT,
  source_doc_nr TEXT,
  source_doc_line_type TEXT,
  source_doc_line_nr TEXT,
  description TEXT,
  sku TEXT,
  
  -- Location information
  issuer_city TEXT,
  issuer_country TEXT,
  issuer_location TEXT,
  receiver_city TEXT,
  receiver_country TEXT,
  receiver_location TEXT,
  
  -- Legal entity information
  issuer_legal_entity TEXT,
  issuer_legal_name TEXT,
  issuer_trn TEXT,
  receiver_legal_entity TEXT,
  receiver_legal_name TEXT,
  receiver_trn TEXT,
  
  -- Financial data
  document_currency TEXT,
  vat_currency TEXT,
  vat_rate NUMERIC,
  fx_rate NUMERIC,
  price_excluding_vat_doc_currency NUMERIC,
  price_excluding_vat_vat_currency NUMERIC,
  vat_amount_doc_currency NUMERIC,
  vat_amount_vat_currency NUMERIC,
  price_including_vat_doc_currency NUMERIC,
  
  -- Additional tracking fields
  commission_amount NUMERIC,
  shipping_amount NUMERIC,
  net_amount_received NUMERIC,
  country TEXT NOT NULL DEFAULT 'UAE',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store credit report data (returns/refunds)
CREATE TABLE public.noon_credit_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Document information
  contract TEXT,
  business_unit TEXT,
  document_type TEXT,
  invoice_type_code TEXT,
  document_subtype TEXT,
  document_date TIMESTAMP WITH TIME ZONE,
  invoice_nr TEXT,
  invoice_line_nr TEXT,
  credit_note_nr TEXT,
  credit_note_line_nr TEXT,
  transaction_type TEXT,
  source_doc_type TEXT,
  source_doc_nr TEXT,
  source_doc_line_type TEXT,
  source_doc_line_nr TEXT,
  description TEXT,
  sku TEXT,
  
  -- Location information
  issuer_city TEXT,
  issuer_country TEXT,
  issuer_location TEXT,
  receiver_city TEXT,
  receiver_country TEXT,
  receiver_location TEXT,
  
  -- Legal entity information
  issuer_legal_entity TEXT,
  issuer_legal_name TEXT,
  issuer_trn TEXT,
  receiver_legal_entity TEXT,
  receiver_legal_name TEXT,
  receiver_trn TEXT,
  
  -- Financial data
  document_currency TEXT,
  vat_currency TEXT,
  vat_rate NUMERIC,
  fx_rate NUMERIC,
  price_excluding_vat_doc_currency NUMERIC,
  price_excluding_vat_vat_currency NUMERIC,
  vat_amount_doc_currency NUMERIC,
  vat_amount_vat_currency NUMERIC,
  price_including_vat_doc_currency NUMERIC,
  
  -- Additional tracking fields for credits/returns
  return_charges NUMERIC,
  refund_amount NUMERIC,
  country TEXT NOT NULL DEFAULT 'UAE',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.noon_file_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noon_invoice_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noon_credit_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for noon_file_headers
CREATE POLICY "Users can view their own file headers" 
ON public.noon_file_headers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own file headers" 
ON public.noon_file_headers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file headers" 
ON public.noon_file_headers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for noon_invoice_data
CREATE POLICY "Users can view their own invoice data" 
ON public.noon_invoice_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice data" 
ON public.noon_invoice_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice data" 
ON public.noon_invoice_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice data" 
ON public.noon_invoice_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for noon_credit_data
CREATE POLICY "Users can view their own credit data" 
ON public.noon_credit_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit data" 
ON public.noon_credit_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit data" 
ON public.noon_credit_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit data" 
ON public.noon_credit_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_noon_file_headers_updated_at
BEFORE UPDATE ON public.noon_file_headers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_noon_invoice_data_updated_at
BEFORE UPDATE ON public.noon_invoice_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_noon_credit_data_updated_at
BEFORE UPDATE ON public.noon_credit_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_noon_invoice_data_user_country ON public.noon_invoice_data(user_id, country);
CREATE INDEX idx_noon_credit_data_user_country ON public.noon_credit_data(user_id, country);
CREATE INDEX idx_noon_invoice_data_sku ON public.noon_invoice_data(sku);
CREATE INDEX idx_noon_credit_data_sku ON public.noon_credit_data(sku);
CREATE INDEX idx_noon_invoice_data_invoice_nr ON public.noon_invoice_data(invoice_nr);
CREATE INDEX idx_noon_credit_data_credit_note_nr ON public.noon_credit_data(credit_note_nr);