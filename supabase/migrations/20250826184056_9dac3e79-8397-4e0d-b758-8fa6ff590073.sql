-- Delete all PO orders from the database
DELETE FROM public.po_orders;

-- Delete all PO upload job errors
DELETE FROM public.po_upload_job_errors;

-- Delete all PO upload jobs
DELETE FROM public.po_upload_jobs;