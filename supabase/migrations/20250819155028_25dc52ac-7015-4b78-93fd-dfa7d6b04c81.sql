-- Add missing description column to sunsky_skus table
ALTER TABLE public.sunsky_skus ADD COLUMN IF NOT EXISTS description TEXT;