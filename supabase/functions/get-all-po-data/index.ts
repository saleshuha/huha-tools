import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      sunsky_skus: {
        Row: {
          id: string;
          user_id: string;
          sku_code: string;
          title?: string;
          description?: string;
          cost?: number;
          weight?: number;
          notes?: string;
          currency?: string;
          country?: string;
          created_at: string;
          updated_at: string;
        };
      };
      po_orders: {
        Row: {
          id: string;
          user_id: string;
          po_number: string;
          sku_code: string;
          quantity: number;
          status: string;
          order_date?: string;
          expected_delivery?: string;
          notes?: string;
          file_name: string;
          country?: string;
          currency?: string;
          unit_cost?: number;
          total_cost?: number;
          sku_user_id?: string;
          supplier_order_number?: string;
          tracking_number?: string;
          tracking_url?: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PO data fetch...');
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key present:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('User authentication failed');
    }

    console.log(`Fetching data for user: ${user.id}`);

    // Fetch ALL Sunsky SKUs using direct database access
    console.log('Fetching ALL Sunsky SKUs...');
    let allSkus: any[] = [];
    let skuOffset = 0;
    const chunkSize = 1000;
    let hasMoreSkus = true;

    while (hasMoreSkus) {
      const { data: skuChunk, error: skuError } = await supabase
        .from('sunsky_skus')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(skuOffset, skuOffset + chunkSize - 1);

      if (skuError) {
        console.error('Error fetching SKUs:', skuError);
        throw skuError;
      }

      if (skuChunk && skuChunk.length > 0) {
        allSkus = allSkus.concat(skuChunk);
        console.log(`Loaded ${allSkus.length} SKUs so far...`);
        
        if (skuChunk.length < chunkSize) {
          hasMoreSkus = false;
        } else {
          skuOffset += chunkSize;
        }
      } else {
        hasMoreSkus = false;
      }
    }

    console.log(`Total SKUs loaded: ${allSkus.length}`);

    // Fetch ALL PO Orders using direct database access
    console.log('Fetching ALL PO Orders...');
    let allOrders: any[] = [];
    let orderOffset = 0;
    let hasMoreOrders = true;

    while (hasMoreOrders) {
      const { data: orderChunk, error: orderError } = await supabase
        .from('po_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(orderOffset, orderOffset + chunkSize - 1);

      if (orderError) {
        console.error('Error fetching PO orders:', orderError);
        throw orderError;
      }

      if (orderChunk && orderChunk.length > 0) {
        allOrders = allOrders.concat(orderChunk);
        console.log(`Loaded ${allOrders.length} PO orders so far...`);
        
        if (orderChunk.length < chunkSize) {
          hasMoreOrders = false;
        } else {
          orderOffset += chunkSize;
        }
      } else {
        hasMoreOrders = false;
      }
    }

    console.log(`Total PO orders loaded: ${allOrders.length}`);

    // Create a SKU lookup map for efficient joining
    const skuMap = new Map();
    allSkus.forEach(sku => {
      skuMap.set(sku.sku_code, sku);
    });

    // Add sunsky_sku to each order
    const ordersWithSkus = allOrders.map(order => ({
      ...order,
      sunsky_sku: skuMap.get(order.sku_code) || null
    }));

    console.log('Successfully fetched and processed all data');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sunskySKUs: allSkus,
          poOrders: ordersWithSkus
        },
        message: `Loaded ${allSkus.length} SKUs and ${allOrders.length} PO orders`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-all-po-data function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});