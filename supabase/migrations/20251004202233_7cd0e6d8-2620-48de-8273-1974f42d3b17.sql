-- Delete all records from po_orders table
-- This will remove all purchase order data while keeping the table structure
DELETE FROM public.po_orders;

-- Log this action for audit purposes
INSERT INTO public.security_audit_log (user_id, action, table_name, record_id)
VALUES (auth.uid(), 'TRUNCATE', 'po_orders', 'all_records');