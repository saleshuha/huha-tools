-- Create a function to get current exchange rates for currency conversion
CREATE OR REPLACE FUNCTION public.get_exchange_rate(from_currency text, to_currency text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Simple hardcoded exchange rates for demo purposes
  -- In production, this would fetch from a real-time exchange rate API
  IF from_currency = 'USD' AND to_currency = 'AED' THEN
    RETURN 3.67;
  ELSIF from_currency = 'USD' AND to_currency = 'SAR' THEN
    RETURN 3.75;
  ELSIF from_currency = to_currency THEN
    RETURN 1.0;
  ELSE
    -- Default to 1:1 if conversion not found
    RETURN 1.0;
  END IF;
END;
$$;