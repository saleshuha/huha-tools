import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalculationConfig {
  calculation_method: string;
  include_manual_adjustments: boolean;
  manual_adjustment_weight: number;
  include_po_restocks: boolean;
  po_restock_weight: number;
  include_returns: boolean;
  return_weight: number;
  lookback_days: number;
  use_velocity_multiplier: boolean;
  fast_moving_multiplier: number;
  medium_moving_multiplier: number;
  slow_moving_multiplier: number;
  safety_stock_days: number;
  lead_time_days: number;
  min_order_quantity: number;
  max_order_quantity: number;
  round_to_multiple: number;
}

interface StockChange {
  change_amount: number;
  created_at: string;
  source_type: string;
  reference_type?: string;
}

interface CalculationBreakdown {
  total_recommended: number;
  breakdown: {
    from_manual_adjustments: number;
    from_po_restocks: number;
    from_sales_velocity: number;
    from_returns: number;
    safety_stock: number;
    lead_time_coverage: number;
  };
  applied_multipliers: {
    velocity_multiplier: number;
    source_weights: Record<string, number>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inventory_id, inventory_type, config } = await req.json() as {
      inventory_id: string;
      inventory_type: 'asin' | 'sku';
      config: CalculationConfig;
    };

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Fetch stock changes with filtering based on config
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.lookback_days);

    const { data: stockChanges, error } = await supabaseClient
      .from('stock_changes')
      .select('change_amount, created_at, source_type, reference_type')
      .eq('inventory_id', inventory_id)
      .eq('inventory_type', inventory_type)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    let recommendedQty = 0;
    let breakdown: CalculationBreakdown['breakdown'] = {
      from_manual_adjustments: 0,
      from_po_restocks: 0,
      from_sales_velocity: 0,
      from_returns: 0,
      safety_stock: 0,
      lead_time_coverage: 0,
    };

    const changes = (stockChanges || []) as StockChange[];

    switch (config.calculation_method) {
      case 'velocity_based':
        recommendedQty = calculateVelocityBased(changes, config, breakdown);
        break;
      case 'days_of_stock':
        recommendedQty = calculateDaysOfStock(changes, config, breakdown);
        break;
      case 'weighted_average':
        recommendedQty = calculateWeightedAverage(changes, config, breakdown);
        break;
      case 'simple':
      default:
        recommendedQty = calculateSimple(changes, breakdown);
        break;
    }

    // Apply constraints
    recommendedQty = Math.max(config.min_order_quantity, recommendedQty);
    recommendedQty = Math.min(config.max_order_quantity, recommendedQty);
    recommendedQty = Math.ceil(recommendedQty / config.round_to_multiple) * config.round_to_multiple;

    breakdown.total_recommended = recommendedQty;

    return new Response(
      JSON.stringify({
        recommended_quantity: recommendedQty,
        breakdown: {
          total_recommended: recommendedQty,
          breakdown,
          applied_multipliers: {
            velocity_multiplier: 1.0,
            source_weights: {
              manual_adjustments: config.manual_adjustment_weight,
              po_restocks: config.po_restock_weight,
              returns: config.return_weight,
            },
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error calculating replenishment quantity:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function calculateSimple(changes: StockChange[], breakdown: CalculationBreakdown['breakdown']): number {
  const totalSold = changes
    .filter(c => c.change_amount < 0)
    .reduce((sum, c) => sum + Math.abs(c.change_amount), 0);
  
  breakdown.from_sales_velocity = totalSold;
  return Math.max(1, Math.ceil(totalSold / 2));
}

function calculateVelocityBased(
  changes: StockChange[],
  config: CalculationConfig,
  breakdown: CalculationBreakdown['breakdown']
): number {
  // Calculate daily sales velocity
  const salesChanges = changes.filter(c => 
    c.source_type === 'customer_sale' || c.change_amount < 0
  );
  
  if (salesChanges.length === 0) return config.min_order_quantity;

  const firstDate = new Date(salesChanges[0]?.created_at || Date.now());
  const lastDate = new Date(salesChanges[salesChanges.length - 1]?.created_at || Date.now());
  const daysSpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const totalSales = salesChanges.reduce((sum, c) => sum + Math.abs(c.change_amount), 0);
  const avgDailySales = totalSales / daysSpan;

  // Calculate for (lead_time + safety_stock) days
  const daysToOrder = config.lead_time_days + config.safety_stock_days;
  const baseQty = avgDailySales * daysToOrder;

  breakdown.from_sales_velocity = Math.ceil(avgDailySales * config.lead_time_days);
  breakdown.safety_stock = Math.ceil(avgDailySales * config.safety_stock_days);
  breakdown.lead_time_coverage = config.lead_time_days;

  return Math.ceil(baseQty);
}

function calculateDaysOfStock(
  changes: StockChange[],
  config: CalculationConfig,
  breakdown: CalculationBreakdown['breakdown']
): number {
  // Order enough to last for (lead_time + safety_stock) days based on recent velocity
  const recentSales = changes
    .filter(c => c.source_type === 'customer_sale' || c.change_amount < 0)
    .slice(-30); // Last 30 transactions

  if (recentSales.length === 0) return config.min_order_quantity;

  const avgSaleSize = recentSales.reduce((sum, c) => sum + Math.abs(c.change_amount), 0) / recentSales.length;
  const daysOfStock = config.lead_time_days + config.safety_stock_days;

  breakdown.from_sales_velocity = Math.ceil(avgSaleSize * config.lead_time_days / 7);
  breakdown.safety_stock = Math.ceil(avgSaleSize * config.safety_stock_days / 7);
  breakdown.lead_time_coverage = config.lead_time_days;

  return Math.ceil(avgSaleSize * (daysOfStock / 7)); // Assuming weekly sales pattern
}

function calculateWeightedAverage(
  changes: StockChange[],
  config: CalculationConfig,
  breakdown: CalculationBreakdown['breakdown']
): number {
  // Apply different weights to different source types
  let weightedSum = 0;

  changes.forEach(change => {
    const absAmount = Math.abs(change.change_amount);

    switch (change.source_type) {
      case 'manual_adjustment':
        if (config.include_manual_adjustments && change.change_amount < 0) {
          const weighted = absAmount * config.manual_adjustment_weight;
          weightedSum += weighted;
          breakdown.from_manual_adjustments += weighted;
        }
        break;
      case 'po_fulfillment':
        if (config.include_po_restocks && change.change_amount < 0) {
          const weighted = absAmount * config.po_restock_weight;
          weightedSum += weighted;
          breakdown.from_po_restocks += weighted;
        }
        break;
      case 'customer_return':
        if (config.include_returns) {
          const weighted = absAmount * config.return_weight;
          weightedSum += weighted;
          breakdown.from_returns += weighted;
        }
        break;
      case 'customer_sale':
        if (change.change_amount < 0) {
          weightedSum += absAmount; // Base weight of 1.0
          breakdown.from_sales_velocity += absAmount;
        }
        break;
      default:
        if (change.change_amount < 0) {
          weightedSum += absAmount;
          breakdown.from_sales_velocity += absAmount;
        }
        break;
    }
  });

  return Math.max(1, Math.ceil(weightedSum / 2));
}
