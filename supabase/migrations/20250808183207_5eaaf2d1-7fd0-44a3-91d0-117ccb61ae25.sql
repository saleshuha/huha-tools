-- Clear all SKU records for KSA to enable fresh upload
DELETE FROM public.sunsky_skus WHERE country = 'KSA';

-- Reset any related data that might reference these SKUs
DELETE FROM public.po_orders WHERE country = 'KSA';

-- Add a comment for tracking
COMMENT ON TABLE public.sunsky_skus IS 'SKU table - KSA records cleared on 2025-08-08 for fresh upload';