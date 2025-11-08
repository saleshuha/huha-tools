import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

interface FulfillmentRequest {
  poNumber: string;
  quantity: number;
  asin?: string;
  title?: string;
  originalQuantity: number;
}

Deno.serve(async (req) => {
  // 🚀 Immediate logging to confirm function receives requests
  console.log('🚀 Function invoked:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Checking authorization header...');
    
    // Get Authorization header safely
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authorization header present');

    // Create Supabase client with safe header handling
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('📝 Authenticating user...');

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('❌ Authentication error:', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: userError?.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    console.log('📝 Parsing request body...');
    const { poNumber, quantity, asin, title, originalQuantity }: FulfillmentRequest = await req.json();

    console.log('📦 Fulfillment request:', { poNumber, quantity, asin, title, originalQuantity, user: user.id });

    // Create background task
    const { data: taskData, error: taskError } = await supabaseClient
      .from('background_tasks')
      .insert({
        user_id: user.id,
        type: 'po_fulfillment',
        status: 'processing',
        total_items: 1,
        processed_items: 0,
        metadata: {
          po_number: poNumber,
          quantity,
          asin,
          title,
          original_quantity: originalQuantity,
        },
      })
      .select()
      .single();

    if (taskError) {
      console.error('❌ Failed to create background task:', taskError);
      throw taskError;
    }

    console.log('✅ Background task created:', taskData.id);

    // Process fulfillment in background (don't await to return quickly)
    processFulfillment(supabaseClient, user.id, poNumber, quantity, asin, originalQuantity, taskData.id).catch((err) => {
      console.error('Background fulfillment error:', err);
    });

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Fulfillment started',
        taskId: taskData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ CRITICAL ERROR in fulfill-from-stock:');
    console.error('Error message:', error?.message);
    console.error('Error name:', error?.name);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error occurred',
        type: error?.name || 'Error',
        details: 'Check edge function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processFulfillment(
  supabaseClient: any,
  userId: string,
  poNumber: string,
  quantity: number,
  asin: string | undefined,
  originalQuantity: number,
  taskId: string
) {
  try {
    console.log('🔄 Processing fulfillment for PO:', poNumber);

    // Validate ASIN is provided
    if (!asin) {
      throw new Error('ASIN is required for fulfillment');
    }

    // Step 1: Find the PO record
    const { data: poRecords, error: fetchError } = await supabaseClient
      .from('po_orders')
      .select('id, asin, quantity, model_number')
      .eq('po_number', poNumber)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;
    if (!poRecords || poRecords.length === 0) throw new Error('PO record not found');

    console.log('✅ Found PO records:', poRecords.length);

    // Step 2: Find inventory by ASIN
    let inventoryItem = null;

    if (asin) {
      const result = await supabaseClient
        .from('asin_inventory')
        .select('id, quantity, asin, sku, serial_number, status')
        .eq('asin', asin)
        .eq('user_id', userId)
        .eq('status', 'in-stock')
        .maybeSingle();

      inventoryItem = result.data;
      if (result.error) {
        console.error('❌ Inventory lookup error:', result.error);
      }
    }

    if (!inventoryItem) {
      throw new Error(`No in-stock inventory found for ASIN: ${asin || 'N/A'}`);
    }

    console.log('✅ Found inventory item:', inventoryItem.id, 'with quantity:', inventoryItem.quantity);

    // Validate sufficient stock
    if (inventoryItem.quantity < quantity) {
      throw new Error(`Insufficient stock: Only ${inventoryItem.quantity} available, but ${quantity} requested`);
    }

    const newQuantity = inventoryItem.quantity - quantity;
    const notes = `Fulfilled from stock: ${quantity}\nOriginal quantity: ${originalQuantity}\nFulfilled on: ${new Date().toISOString()}`;

    // Step 3: Update PO status to closed (only for the specific ASIN)
    const { error: updateError } = await supabaseClient
      .from('po_orders')
      .update({
        status: 'closed',
        notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('po_number', poNumber)
      .eq('user_id', userId)
      .eq('asin', asin);

    if (updateError) throw updateError;
    console.log('✅ PO status updated to closed');

    // Step 4: Update inventory quantity
    const { error: invUpdateError } = await supabaseClient
      .from('asin_inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventoryItem.id);

    if (invUpdateError) throw invUpdateError;
    console.log('✅ Inventory updated, new quantity:', newQuantity);

    // Step 5: Log stock change
    const { error: stockChangeError } = await supabaseClient.from('stock_changes').insert({
      inventory_id: inventoryItem.id,
      inventory_type: 'asin',
      asin: inventoryItem.asin,
      sku_number: inventoryItem.sku,
      serial_number: inventoryItem.serial_number,
      previous_quantity: inventoryItem.quantity,
      new_quantity: newQuantity,
      change_amount: -quantity,
      change_reason: `Fulfilled from stock for PO ${poNumber}`,
      reference_type: 'po_order',
      reference_number: poNumber,
      fulfillment_source: 'in_stock',
      user_id: userId,
      changed_by: userId,
      notes: `Manually fulfilled ${quantity} units from in-stock inventory`,
    });

    if (stockChangeError) {
      console.error('❌ Failed to log stock change:', stockChangeError);
      throw new Error('Failed to log stock change: ' + stockChangeError.message);
    }
    console.log('✅ Stock change logged');

    // Step 6: Create fulfillment history record
    const { error: fulfillmentHistoryError } = await supabaseClient.from('fulfillment_history').insert({
      po_number: poNumber,
      fulfilled_quantity: quantity,
      original_quantity: originalQuantity,
      fulfillment_source: 'stock',
      inventory_id: inventoryItem.id,
      asin: inventoryItem.asin || asin,
      sku_code: inventoryItem.sku,
      model_number: poRecords[0]?.model_number,
      user_id: userId,
      notes: `Fulfilled ${quantity} units from in-stock inventory. Serial: ${inventoryItem.serial_number || 'N/A'}. Remaining stock: ${newQuantity}`,
    });

    if (fulfillmentHistoryError) {
      console.error('⚠️ Failed to create fulfillment history:', fulfillmentHistoryError);
    } else {
      console.log('✅ Fulfillment history created');
    }

    // Update background task to completed
    await supabaseClient
      .from('background_tasks')
      .update({
        status: 'completed',
        processed_items: 1,
        progress: 100,
        completed_at: new Date().toISOString(),
        metadata: {
          po_number: poNumber,
          quantity,
          asin,
          remaining_stock: newQuantity,
          success: true,
        },
      })
      .eq('id', taskId);

    console.log('✅ Fulfillment completed successfully for PO:', poNumber);
  } catch (error) {
    console.error('❌ Error processing fulfillment:', error);

    // Update background task to failed
    await supabaseClient
      .from('background_tasks')
      .update({
        status: 'failed',
        metadata: {
          po_number: poNumber,
          error: error.message,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  }
}
