-- Update UAE payment terms to 60 days credit period
UPDATE payment_terms 
SET credit_days = 60, 
    updated_at = NOW()
WHERE country = 'UAE';