-- Delete all PO orders from the database
DELETE FROM public.po_orders;

-- Reset any sequences if needed (though UUID primary keys don't use sequences)
-- This will completely clear all purchase order data