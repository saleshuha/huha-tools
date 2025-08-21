import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      sunsky_skus: {
        Row: {
          id: string
          user_id: string
          sku_code: string
          title: string | null
          cost: number | null
          weight: number | null
          currency: string | null
          country: string
          created_at: string
          updated_at: string
        }
      }
      po_orders: {
        Row: {
          id: string
          user_id: string
          po_number: string
          sku_code: string
          quantity: number
          status: string
          order_date: string | null
          expected_delivery: string | null
          notes: string | null
          file_name: string
          country: string | null
          currency: string | null
          unit_cost: number | null
          total_cost: number | null
          sku_user_id: string
          supplier_order_number: string | null
          tracking_number: string | null
          tracking_url: string | null
          created_at: string
          updated_at: string
          ship_to_location: string | null
          asin: string | null
          model_number: string | null
          title: string | null
          external_id: string | null
          external_id_type: string | null
        }
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract the JWT token from the Bearer token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    console.log(`🔍 Fetching all data for user: ${user.id}`);

    // Get counts first for progress tracking
    const [{ count: skuCount }, { count: poCount }] = await Promise.all([
      supabase.from('sunsky_skus').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('po_orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    ]);

    console.log(`📊 Total counts - SKUs: ${skuCount}, PO Orders: ${poCount}`);

    // Fetch all data in chunks to manage large datasets
    const chunkSize = 1000;
    const sunskySKUs = [];
    const poOrders = [];

    // Fetch all SKUs in chunks
    let skuOffset = 0;
    while (true) {
      const { data: skuBatch, error: skuError } = await supabase
        .from('sunsky_skus')
        .select('*')
        .eq('user_id', user.id)
        .range(skuOffset, skuOffset + chunkSize - 1);

      if (skuError) throw skuError;
      if (!skuBatch || skuBatch.length === 0) break;

      sunskySKUs.push(...skuBatch);
      skuOffset += chunkSize;
      
      console.log(`📦 Loaded ${sunskySKUs.length}/${skuCount} SKUs`);
      
      if (skuBatch.length < chunkSize) break;
    }

    // Fetch all PO orders in chunks
    let poOffset = 0;
    while (true) {
      const { data: poBatch, error: poError } = await supabase
        .from('po_orders')
        .select('*')
        .eq('user_id', user.id)
        .range(poOffset, poOffset + chunkSize - 1);

      if (poError) throw poError;
      if (!poBatch || poBatch.length === 0) break;

      poOrders.push(...poBatch);
      poOffset += chunkSize;
      
      console.log(`📋 Loaded ${poOrders.length}/${poCount} PO orders`);
      
      if (poBatch.length < chunkSize) break;
    }

    // Create SKU lookup map for efficient joining
    const skuMap = new Map();
    for (const sku of sunskySKUs) {
      skuMap.set(sku.sku_code, sku);
    }

    // Join PO orders with SKU data
    const poOrdersWithSKUs = poOrders.map(order => ({
      ...order,
      sunsky_sku: skuMap.get(order.sku_code) || skuMap.get(order.model_number) || null
    }));

    console.log(`✅ Returning ${sunskySKUs.length} SKUs and ${poOrdersWithSKUs.length} PO orders with joined data`);

    return new Response(
      JSON.stringify({
        sunskySKUs,
        poOrders: poOrdersWithSKUs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in get-all-po-data function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})