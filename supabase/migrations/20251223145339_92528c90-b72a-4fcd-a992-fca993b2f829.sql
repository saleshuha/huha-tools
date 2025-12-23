-- Add include_sales and sales_weight columns to replenishment_calculation_configs
ALTER TABLE public.replenishment_calculation_configs
ADD COLUMN IF NOT EXISTS include_sales BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sales_weight NUMERIC(3,2) NOT NULL DEFAULT 1.0;