-- Remove all SKU-related database tables and their dependencies
-- Drop tables in order to handle foreign key dependencies

-- Drop import job related tables first (they reference sunsky_skus)
DROP TABLE IF EXISTS public.sunsky_import_job_items CASCADE;
DROP TABLE IF EXISTS public.sunsky_import_logs CASCADE;
DROP TABLE IF EXISTS public.sunsky_import_jobs CASCADE;

-- Drop SKU inventory and related tables
DROP TABLE IF EXISTS public.sku_inventory CASCADE;
DROP TABLE IF EXISTS public.sku_costs CASCADE;

-- Drop Sunsky SKU tables and credentials
DROP TABLE IF EXISTS public.sunsky_skus CASCADE;
DROP TABLE IF EXISTS public.sunsky_credentials CASCADE;
DROP TABLE IF EXISTS public.sunsky_api_usage CASCADE;

-- Drop any functions that might reference these tables
DROP FUNCTION IF EXISTS public.get_all_sunsky_skus(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_sunsky_sku_currency() CASCADE;