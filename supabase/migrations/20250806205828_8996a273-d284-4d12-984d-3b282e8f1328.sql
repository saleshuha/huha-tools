-- Clear PO tracker related data for fresh start
-- This will delete all existing data in sunsky_skus and po_orders tables

-- Delete all PO orders first (due to potential references)
DELETE FROM public.po_orders;

-- Delete all Sunsky SKUs
DELETE FROM public.sunsky_skus;

-- Reset any sequences if needed (optional, for clean IDs)
-- Note: UUIDs don't need sequence resets