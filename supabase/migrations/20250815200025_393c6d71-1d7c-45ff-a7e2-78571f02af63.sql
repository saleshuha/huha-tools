-- Create country enum type
CREATE TYPE country_code AS ENUM ('UAE', 'KSA');

-- Create orders table for Amazon Fulfillment tracking
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  invoice_id TEXT,
  shipment_date DATE,
  invoice_date DATE,
  vat_id TEXT,
  asin TEXT,
  sku TEXT,
  item_title TEXT,
  quantity INTEGER DEFAULT 1,
  item_cost NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  warehouse_code TEXT,
  status TEXT DEFAULT 'Non Submitted',
  currency TEXT DEFAULT 'USD',
  country country_code DEFAULT 'UAE',
  user_id UUID REFERENCES auth.users NOT NULL,
  payment_due_date DATE,
  payment_schedule_days INTEGER DEFAULT 45,
  payment_status TEXT DEFAULT 'pending',
  payment_reminder_date DATE,
  payment_completed_date DATE,
  payment_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, user_id)
);

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view orders in their country" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can create orders in their country" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" 
ON public.orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create exchange rates table
CREATE TABLE public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS on exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage exchange rates" 
ON public.exchange_rates 
FOR ALL 
USING (is_user_admin(auth.uid()));

-- Create payment terms table
CREATE TABLE public.payment_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country country_code NOT NULL,
  credit_days INTEGER DEFAULT 45,
  vat_rate NUMERIC DEFAULT 5,
  currency TEXT NOT NULL,
  flag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country)
);

-- Enable RLS on payment_terms
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payment terms" 
ON public.payment_terms 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage payment terms" 
ON public.payment_terms 
FOR ALL 
USING (is_user_admin(auth.uid()));

-- Insert default exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
('USD', 'AED', 3.67),
('USD', 'SAR', 3.75),
('AED', 'USD', 0.27),
('SAR', 'USD', 0.27),
('AED', 'SAR', 1.02),
('SAR', 'AED', 0.98);

-- Insert default payment terms
INSERT INTO public.payment_terms (country, credit_days, vat_rate, currency, flag) VALUES
('UAE', 45, 5, 'AED', '🇦🇪'),
('KSA', 45, 15, 'SAR', '🇸🇦');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();