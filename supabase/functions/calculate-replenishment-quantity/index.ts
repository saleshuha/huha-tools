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
  from_manual_adjustments: number;
  from_po_restocks: number;
  from_sales_velocity: number;
  from_returns: number;
  safety_stock: number;
  lead_time_coverage: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Support both single item and batch processing
    const isBatch = Array.isArray(requestData.items);
    const config = requestData.config as CalculationConfig;
    
    console.log(`📊 Replenishment calculation request - Mode: ${isBatch ? 'batch' : 'single'}`);
    console.log(`⚙️ Config: method=${config.calculation_method}, lookback=${config.lookback_days}d`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    if (isBatch) {
      // Batch processing
      const items = requestData.items as Array<{ inventory_id: string; inventory_type: 'asin' | 'sku' }>;
      console.log(`📦 Processing ${items.length} items in batch`);
      
      const results = await Promise.all(
        items.map(async (item) => {
          try {
            const result = await calculateForItem(supabaseClient, item.inventory_id, item.inventory_type, config);
            return { inventory_id: item.inventory_id, ...result };
          } catch (error) {
            console.error(`Error calculating for ${item.inventory_id}:`, error);
            return { 
              inventory_id: item.inventory_id, 
              recommended_quantity: config.min_order_quantity,
              error: error.message 
            };
          }
        })
      );

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // Single item processing
      const { inventory_id, inventory_type } = requestData;
      console.log(`📦 Processing single item: ${inventory_type}:${inventory_id}`);
      
      const result = await calculateForItem(supabaseClient, inventory_id, inventory_type, config);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in calculate-replenishment-quantity:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function calculateForItem(
  supabaseClient: any,
  inventoryId: string,
  inventoryType: 'asin' | 'sku',
  config: CalculationConfig
) {
  // Fetch stock changes with filtering based on config
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.lookback_days);

  const { data: stockChanges, error } = await supabaseClient
    .from('stock_changes')
    .select('change_amount, created_at, source_type, reference_type')
    .eq('inventory_id', inventoryId)
    .eq('inventory_type', inventoryType)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const changes = (stockChanges || []) as StockChange[];
  
  let breakdown: CalculationBreakdown = {
    from_manual_adjustments: 0,
    from_po_restocks: 0,
    from_sales_velocity: 0,
    from_returns: 0,
    safety_stock: 0,
    lead_time_coverage: 0,
  };

  // Calculate using unified method
  let recommendedQty = calculateUnified(changes, config, breakdown);

  // Apply constraints
  recommendedQty = Math.max(config.min_order_quantity, recommendedQty);
  recommendedQty = Math.min(config.max_order_quantity, recommendedQty);
  recommendedQty = Math.ceil(recommendedQty / config.round_to_multiple) * config.round_to_multiple;

  // Final safety check
  if (recommendedQty < config.min_order_quantity) {
    recommendedQty = config.min_order_quantity;
  }

  return {
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
      stock_changes_count: changes.length,
      lookback_days: config.lookback_days,
    },
  };
}

function calculateUnified(
  changes: StockChange[],
  config: CalculationConfig,
  breakdown: CalculationBreakdown
): number {
  if (changes.length === 0) {
    return config.min_order_quantity;
  }

  const includeSales = config.include_sales ?? true;
  const salesWeight = config.sales_weight ?? 1.0;

  let weightedDemand = 0;
  
  changes.forEach(change => {
    if (change.change_amount >= 0) return; // Only count reductions
    
    const absAmount = Math.abs(change.change_amount);
    let weight = 1.0;
    let included = false;
    
    switch (change.source_type) {
      case 'manual_adjustment':
      case 'inventory_correction':
        if (config.include_manual_adjustments) {
          weight = config.manual_adjustment_weight;
          breakdown.from_manual_adjustments += absAmount * weight;
          included = true;
        }
        break;
        
      case 'stock_receiving':
      case 'po_fulfillment':
        if (config.include_po_restocks) {
          weight = config.po_restock_weight;
          breakdown.from_po_restocks += absAmount * weight;
          included = true;
        }
        break;
        
      case 'customer_return':
      case 'return':
        if (config.include_returns) {
          weight = config.return_weight;
          breakdown.from_returns += absAmount * weight;
          included = true;
        }
        break;
        
      case null:
      case 'customer_sale':
      case 'sale':
      default:
        if (includeSales) {
          weight = salesWeight;
          breakdown.from_sales_velocity += absAmount * weight;
          included = true;
        }
        break;
    }
    
    if (included) {
      weightedDemand += absAmount * weight;
    }
  });
  
  if (weightedDemand === 0) {
    return config.min_order_quantity;
  }
  
  // Calculate daily velocity
  const firstDate = new Date(changes[0]?.created_at || Date.now());
  const lastDate = new Date(changes[changes.length - 1]?.created_at || Date.now());
  const daysSpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const dailyVelocity = weightedDemand / daysSpan;
  
  // Apply calculation method
  let baseQty = 0;
  
  switch (config.calculation_method) {
    case 'simple':
      baseQty = weightedDemand / 2;
      break;
      
    case 'velocity_based':
      const coverageDays = config.lead_time_days + config.safety_stock_days;
      baseQty = dailyVelocity * coverageDays;
      breakdown.lead_time_coverage = config.lead_time_days;
      breakdown.safety_stock = Math.ceil(dailyVelocity * config.safety_stock_days);
      break;
      
    case 'days_of_stock':
      baseQty = dailyVelocity * (config.lead_time_days + config.safety_stock_days);
      breakdown.lead_time_coverage = config.lead_time_days;
      breakdown.safety_stock = Math.ceil(dailyVelocity * config.safety_stock_days);
      break;
      
    case 'weighted_average':
      baseQty = dailyVelocity * config.lead_time_days;
      breakdown.safety_stock = Math.ceil(dailyVelocity * config.safety_stock_days);
      baseQty += breakdown.safety_stock;
      breakdown.lead_time_coverage = config.lead_time_days;
      break;
      
    default:
      baseQty = weightedDemand / 2;
  }
  
  return Math.ceil(baseQty);
}