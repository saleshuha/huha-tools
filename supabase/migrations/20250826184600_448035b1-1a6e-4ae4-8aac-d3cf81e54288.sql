-- Completely clean all PO-related data to start fresh
DELETE FROM public.po_orders;
DELETE FROM public.po_upload_job_errors;  
DELETE FROM public.po_upload_jobs;