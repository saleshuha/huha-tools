-- Add 'closed' status to the existing enum
ALTER TYPE public.status_type ADD VALUE IF NOT EXISTS 'closed';