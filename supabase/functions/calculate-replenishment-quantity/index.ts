import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalculationConfig {
  calculation_method: string;
  include_sales: boolean;
  sales_weight: number;
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
  source_type: string | null;
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

    console.log(`📊 Calculating replenishment for ${inventory_type}:${inventory_id}`);
    console.log(`⚙️ Config: method=${config.calculation_method}, lookback=${config.lookback_days}d`);
    console.log(`📋 Sources: sales=${config.include_sales ?? true}(${config.sales_weight ?? 1.0}), manual=${config.include_manual_adjustments}(${config.manual_adjustment_weight}), po=${config.include_po_restocks}(${config.po_restock_weight}), returns=${config.include_returns}(${config.return_weight})`);

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

    console.log(`📦 Found ${stockChanges?.length || 0} stock changes in lookback period`);

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

    // Use unified calculation that applies ALL config parameters
    recommendedQty = calculateUnified(changes, config, breakdown);

    console.log(`📈 Pre-constraint recommended: ${recommendedQty}`);

    // Apply constraints
    recommendedQty = Math.max(config.min_order_quantity, recommendedQty);
    recommendedQty = Math.min(config.max_order_quantity, recommendedQty);
    recommendedQty = Math.ceil(recommendedQty / config.round_to_multiple) * config.round_to_multiple;

    // Final safety check - should never return less than min
    if (recommendedQty < config.min_order_quantity) {
      console.warn(`⚠️ Recommended qty ${recommendedQty} is less than min ${config.min_order_quantity}, forcing to min`);
      recommendedQty = config.min_order_quantity;
    }

    console.log(`✅ Final recommended quantity: ${recommendedQty} (min=${config.min_order_quantity}, max=${config.max_order_quantity})`);

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
              sales: config.sales_weight ?? 1.0,
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

// Unified calculation function that applies ALL config parameters together
function calculateUnified(
  changes: StockChange[],
  config: CalculationConfig,
  breakdown: CalculationBreakdown['breakdown']
): number {
  if (changes.length === 0) {
    console.log('⚠️ No stock changes found, returning min order quantity');
    return config.min_order_quantity;
  }

  // Default include_sales to true if not specified (backwards compatibility)
  const includeSales = config.include_sales ?? true;
  const salesWeight = config.sales_weight ?? 1.0;

  // STEP 1: Filter and weight changes by source type
  let weightedDemand = 0;
  let includedChangesCount = 0;
  let excludedChangesCount = 0;
  
  changes.forEach(change => {
    if (change.change_amount >= 0) return; // Only count reductions (sales/outflows)
    
    const absAmount = Math.abs(change.change_amount);
    let weight = 1.0;
    let sourceCategory = 'unknown';
    let included = false;
    
    // Map database source_type values to config settings
    // Database values: NULL, 'manual_adjustment', 'inventory_correction', 'stock_receiving'
    switch (change.source_type) {
      case 'manual_adjustment':
      case 'inventory_correction':
        // Manual adjustments and corrections
        if (config.include_manual_adjustments) {
          weight = config.manual_adjustment_weight;
          breakdown.from_manual_adjustments += absAmount * weight;
          sourceCategory = 'manual';
          included = true;
        }
        break;
        
      case 'stock_receiving':
      case 'po_fulfillment':
        // PO restocks/receiving
        if (config.include_po_restocks) {
          weight = config.po_restock_weight;
          breakdown.from_po_restocks += absAmount * weight;
          sourceCategory = 'po';
          included = true;
        }
        break;
        
      case 'customer_return':
      case 'return':
        // Returns
        if (config.include_returns) {
          weight = config.return_weight;
          breakdown.from_returns += absAmount * weight;
          sourceCategory = 'return';
          included = true;
        }
        break;
        
      case null:
      case 'customer_sale':
      case 'sale':
      default:
        // NULL source_type or explicit sales - treat as sales (most common case)
        if (includeSales) {
          weight = salesWeight;
          breakdown.from_sales_velocity += absAmount * weight;
          sourceCategory = 'sales';
          included = true;
        }
        break;
    }
    
    if (included) {
      weightedDemand += absAmount * weight;
      includedChangesCount++;
    } else {
      excludedChangesCount++;
    }
  });
  
  console.log(`📊 Weighted demand: ${weightedDemand.toFixed(2)} from ${includedChangesCount} changes (${excludedChangesCount} excluded)`);
  console.log(`📋 Breakdown: sales=${breakdown.from_sales_velocity.toFixed(1)}, manual=${breakdown.from_manual_adjustments.toFixed(1)}, po=${breakdown.from_po_restocks.toFixed(1)}, returns=${breakdown.from_returns.toFixed(1)}`);
  
  // If no demand after filtering, return minimum
  if (weightedDemand === 0) {
    console.log('⚠️ No weighted demand after filtering, returning min order quantity');
    return config.min_order_quantity;
  }
  
  // STEP 2: Calculate daily velocity from weighted demand
  const firstDate = new Date(changes[0]?.created_at || Date.now());
  const lastDate = new Date(changes[changes.length - 1]?.created_at || Date.now());
  const daysSpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const dailyVelocity = weightedDemand / daysSpan;
  console.log(`⏱️ Daily velocity: ${dailyVelocity.toFixed(3)} units/day over ${daysSpan.toFixed(1)} days`);
  
  // STEP 3: Apply calculation method to determine base quantity
  let baseQty = 0;
  
  switch (config.calculation_method) {
    case 'simple':
      baseQty = weightedDemand / 2;
      console.log(`📐 Simple method: ${weightedDemand.toFixed(1)} / 2 = ${baseQty.toFixed(1)}`);
      break;
      
    case 'velocity_based':
      // Daily velocity × (lead time + safety stock)
      const coverageDays = config.lead_time_days + config.safety_stock_days;
      baseQty = dailyVelocity * coverageDays;
      breakdown.lead_time_coverage = config.lead_time_days;
      breakdown.safety_stock = Math.ceil(dailyVelocity * config.safety_stock_days);
      console.log(`📐 Velocity method: ${dailyVelocity.toFixed(3)} × ${coverageDays} = ${baseQty.toFixed(1)}`);
      break;
      
    case 'days_of_stock':
      // Order enough for N days of stock
      baseQty = dailyVelocity * (config.lead_time_days + config.safety_stock_days);
      breakdown.lead_time_coverage = config.lead_time_days;
      breakdown.safety_stock = Math.ceil(dailyVelocity * config.safety_stock_days);
      console.log(`📐 Days of stock method: ${dailyVelocity.toFixed(3)} × ${config.lead_time_days + config.safety_stock_days} = ${baseQty.toFixed(1)}`);
      break;
      
    case 'weighted_average':
      // Use weighted demand with timing multiplier
      baseQty = dailyVelocity * config.lead_time_days;
      breakdown.safety_stock = Math.ceil(dailyVelocity * config.safety_stock_days);
      baseQty += breakdown.safety_stock;
      breakdown.lead_time_coverage = config.lead_time_days;
      console.log(`📐 Weighted average method: (${dailyVelocity.toFixed(3)} × ${config.lead_time_days}) + ${breakdown.safety_stock} = ${baseQty.toFixed(1)}`);
      break;
      
    default:
      baseQty = weightedDemand / 2;
      console.log(`📐 Default/fallback method: ${weightedDemand.toFixed(1)} / 2 = ${baseQty.toFixed(1)}`);
  }
  
  return Math.ceil(baseQty);
}
