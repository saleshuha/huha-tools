-- Add payment receiving date to track future payments
ALTER TABLE public.payments 
ADD COLUMN payment_date timestamp with time zone;

-- Add index for better performance when querying by payment date
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);

-- Add index for better performance when querying by month/year for analytics
CREATE INDEX idx_payments_date_month ON public.payments(EXTRACT(year FROM payment_date), EXTRACT(month FROM payment_date));