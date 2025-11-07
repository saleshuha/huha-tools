-- Create enum for stock change source types
DO $$ BEGIN
  CREATE TYPE stock_change_source AS ENUM (
    'manual_adjustment',
    'po_fulfillment',
    'customer_sale',
    'customer_return',
    'damage_loss',
    'inventory_correction',
    'transfer_in',
    'transfer_out',
    'sunsky_order'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add source_type column to stock_changes table
ALTER TABLE stock_changes 
ADD COLUMN IF NOT EXISTS source_type stock_change_source;

-- Backfill existing data based on reference_type and change_amount
UPDATE stock_changes
SET source_type = CASE
  WHEN reference_type = 'purchase_order' THEN 'po_fulfillment'::stock_change_source
  WHEN reference_type = 'manual' THEN 'manual_adjustment'::stock_change_source
  WHEN change_amount < 0 AND reference_type IS NULL THEN 'customer_sale'::stock_change_source
  WHEN change_amount > 0 AND reference_type IS NULL THEN 'manual_adjustment'::stock_change_source
  ELSE 'inventory_correction'::stock_change_source
END
WHERE source_type IS NULL;

-- Create replenishment calculation configs table
CREATE TABLE IF NOT EXISTS public.replenishment_calculation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  country TEXT NOT NULL DEFAULT 'UAE',
  
  -- Calculation Method Selection
  calculation_method TEXT NOT NULL DEFAULT 'simple',
  
  -- Stock Change Type Weights
  include_manual_adjustments BOOLEAN DEFAULT true,
  manual_adjustment_weight NUMERIC DEFAULT 1.0,
  
  include_po_restocks BOOLEAN DEFAULT true,
  po_restock_weight NUMERIC DEFAULT 1.0,
  
  include_returns BOOLEAN DEFAULT false,
  return_weight NUMERIC DEFAULT 0.5,
  
  -- Time-based criteria
  lookback_days INTEGER DEFAULT 90,
  exclude_first_n_days INTEGER DEFAULT 0,
  
  -- Velocity-based criteria
  use_velocity_multiplier BOOLEAN DEFAULT false,
  fast_moving_multiplier NUMERIC DEFAULT 1.5,
  medium_moving_multiplier NUMERIC DEFAULT 1.0,
  slow_moving_multiplier NUMERIC DEFAULT 0.5,
  
  -- Safety stock criteria
  safety_stock_days INTEGER DEFAULT 7,
  lead_time_days INTEGER DEFAULT 14,
  
  -- Quantity constraints
  min_order_quantity INTEGER DEFAULT 1,
  max_order_quantity INTEGER DEFAULT 100,
  round_to_multiple INTEGER DEFAULT 1,
  
  -- Advanced formulas
  custom_formula TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  UNIQUE(user_id, config_name, country)
);

-- Enable RLS
ALTER TABLE public.replenishment_calculation_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own replenishment configs"
  ON public.replenishment_calculation_configs
  FOR ALL
  USING (auth.uid() = user_id);

-- Create default configuration for all existing users
INSERT INTO public.replenishment_calculation_configs (
  user_id, 
  config_name, 
  is_default, 
  country,
  calculation_method,
  include_manual_adjustments,
  manual_adjustment_weight,
  include_po_restocks,
  po_restock_weight,
  lookback_days,
  safety_stock_days,
  lead_time_days
)
SELECT 
  id as user_id,
  'Default Configuration' as config_name,
  true as is_default,
  'UAE' as country,
  'simple' as calculation_method,
  true as include_manual_adjustments,
  1.0 as manual_adjustment_weight,
  true as include_po_restocks,
  1.0 as po_restock_weight,
  90 as lookback_days,
  7 as safety_stock_days,
  14 as lead_time_days
FROM auth.users
ON CONFLICT (user_id, config_name, country) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stock_changes_source_type 
  ON stock_changes(source_type, inventory_id, created_at);

CREATE INDEX IF NOT EXISTS idx_replenishment_configs_user_default 
  ON replenishment_calculation_configs(user_id, is_default, country);