-- Create enum types for financial records
CREATE TYPE financial_record_type AS ENUM ('loan', 'expense', 'debt', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');

-- Create financial_records table
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type financial_record_type NOT NULL DEFAULT 'expense',
  person_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'AED',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  country TEXT NOT NULL DEFAULT 'UAE'
);

-- Enable Row Level Security
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own financial records" 
ON public.financial_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial records" 
ON public.financial_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial records" 
ON public.financial_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial records" 
ON public.financial_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_financial_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_financial_records_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW
EXECUTE FUNCTION public.update_financial_records_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_financial_records_user_id ON public.financial_records(user_id);
CREATE INDEX idx_financial_records_due_date ON public.financial_records(due_date);
CREATE INDEX idx_financial_records_payment_status ON public.financial_records(payment_status);
CREATE INDEX idx_financial_records_country ON public.financial_records(country);