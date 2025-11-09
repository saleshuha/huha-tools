/**
 * Smart Stock Receiving System - Edge Function
 * Version: 3.0 - Complete Rewrite
 * Date: 2025-05-15
 * 
 * Major Changes in v3.0:
 * - Flexible inventory status matching (in-stock, ordered, processing)
 * - Enhanced logging and error tracking
 * - Improved PO allocation logic
 * - Better session management
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceivedItemData {
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  serial_number?: string;
  supplier_name?: string;
  notes?: string;
  country?: string;
}

interface RequestPayload {
  items: ReceivedItemData[];
  auto_fulfill?: boolean;
  session_notes?: string;
  session_id?: string;
  country?: string;
  test?: boolean;
}

serve(async (req) => {
  console.log('[SR v3.0] Incoming request:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[SR v3.0] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[SR v3.0] Supabase configuration:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey 
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('[SR v3.0] Authorization header:', { 
      present: !!authHeader, 
      prefix: authHeader?.substring(0, 20) + '...' 
    });

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    console.log('[SR v3.0] User authentication:', { 
      success: !!user, 
      userId: user?.id,
      error: authError?.message 
    });

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'Unknown error'}`);
    }

    // Parse request body
    const body: RequestPayload = await req.json();
    
    console.log('[SR v3.0] Request payload parsed:', {
      hasItems: !!body.items,
      itemCount: body.items?.length,
      autoFulfill: body.auto_fulfill,
      hasSessionId: !!body.session_id,
      country: body.country,
      isTest: body.test
    });

    // Test endpoint
    if (body.test) {
      console.log('[SR v3.0] ✅ Test request successful');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Smart Stock Receiving v3.0 is operational',
          version: '3.0',
          timestamp: new Date().toISOString(),
          features: ['flexible-status', 'enhanced-logging', 'improved-allocation']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.items || body.items.length === 0) {
      throw new Error('No items provided for processing');
    }

    const { items, auto_fulfill = true, session_notes, session_id, country } = body;

    console.log(`[SR v3.0] Processing ${items.length} items for user ${user.id}`, {
      autoFulfill: auto_fulfill,
      hasSessionId: !!session_id,
      requestedCountry: country
    });

    // Determine country
    let targetCountry = country;
    let countrySource = 'request';
    
    if (!targetCountry) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();
      
      targetCountry = profile?.country || 'KSA';
      countrySource = profile?.country ? 'profile' : 'default';
    }

    console.log('[SR v3.0] Target country determined:', { 
      country: targetCountry, 
      source: countrySource 
    });

    // Create or use existing session
    let activeSessionId = session_id;
    
    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('stock_receiving_sessions')
        .insert({
          user_id: user.id,
          status: 'in_progress',
          notes: session_notes
        })
        .select()
        .single();

      if (sessionError) {
        console.error('[SR v3.0] Session creation failed:', sessionError);
        throw sessionError;
      }

      activeSessionId = newSession.id;
      console.log('[SR v3.0] New session created:', { sessionId: activeSessionId });
    } else {
      console.log('[SR v3.0] Using existing session:', { sessionId: activeSessionId });
    }

    // Process each item
    const processingResults = [];
    let totalAllocatedToPOs = 0;
    let totalAddedToInventory = 0;

    for (const item of items) {
      console.log('[SR v3.0] Processing item:', {
        asin: item.asin,
        sku: item.sku_code,
        model: item.model_number,
        quantity: item.quantity
      });

      try {
        // Enhance item with country
        const enrichedItem = { ...item, country: targetCountry };

        // Find matching purchase orders
        const matchingPOs = await locateMatchingPurchaseOrders(supabase, user.id, enrichedItem);
        
        console.log('[SR v3.0] Matching POs found:', { 
          count: matchingPOs.length,
          poNumbers: matchingPOs.map(po => po.po_number)
        });

        // Calculate allocation
        const { allocations, remainingQuantity } = computeQuantityAllocation(
          item.quantity,
          matchingPOs
        );

        console.log('[SR v3.0] Allocation computed:', {
          totalAllocations: allocations.length,
          remainingQty: remainingQuantity
        });

        // Execute fulfillment if auto-fulfill enabled
        if (auto_fulfill && allocations.length > 0) {
          for (const allocation of allocations) {
            await executePOFulfillment(supabase, allocation.po, allocation.quantity, user.id);
            totalAllocatedToPOs += allocation.quantity;
          }
        }

        // Add remaining quantity to inventory
        if (remainingQuantity > 0) {
          await updateInventoryStock(supabase, enrichedItem, remainingQuantity, user.id);
          totalAddedToInventory += remainingQuantity;
        }

        // Record receiving event
        await supabase.from('stock_receiving_items').insert({
          session_id: activeSessionId,
          user_id: user.id,
          asin: item.asin,
          sku_code: item.sku_code,
          model_number: item.model_number,
          title: item.title,
          quantity: item.quantity,
          serial_number: item.serial_number,
          supplier_name: item.supplier_name,
          notes: item.notes,
          matched_po_count: allocations.length,
          matched_po_numbers: allocations.map(a => a.po.po_number)
        });

        // Log to receiving history
        await supabase.from('receiving_history').insert({
          user_id: user.id,
          item_type: item.asin ? 'asin' : 'sku',
          identifier: item.asin || item.sku_code || item.model_number || 'unknown',
          quantity: item.quantity,
          session_id: activeSessionId
        });

        processingResults.push({
          item_id: item.asin || item.sku_code || item.model_number,
          success: true,
          allocated_to_pos: allocations.length,
          allocated_quantity: item.quantity - remainingQuantity,
          added_to_inventory: remainingQuantity,
          matched_pos: allocations.map(a => a.po.po_number)
        });

      } catch (itemError) {
        console.error('[SR v3.0] ❌ Item processing error:', {
          item: item,
          error: itemError.message,
          stack: itemError.stack
        });

        processingResults.push({
          item_id: item.asin || item.sku_code || item.model_number,
          success: false,
          error: itemError.message,
          message: `Failed to process: ${itemError.message}`
        });
      }
    }

    // Update session statistics
    console.log('[SR v3.0] Updating session statistics:', {
      sessionId: activeSessionId,
      totalItems: items.length,
      allocatedToPOs: totalAllocatedToPOs,
      addedToInventory: totalAddedToInventory
    });

    await supabase
      .from('stock_receiving_sessions')
      .update({
        items_received: items.length,
        items_allocated_to_pos: totalAllocatedToPOs,
        items_added_to_inventory: totalAddedToInventory
      })
      .eq('id', activeSessionId);

    const responseData = {
      session_id: activeSessionId,
      results: processingResults,
      summary: {
        total_items: items.length,
        items_allocated_to_pos: totalAllocatedToPOs,
        items_added_to_inventory: totalAddedToInventory
      }
    };

    console.log('[SR v3.0] ✅ Processing complete:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SR v3.0] ❌ Request processing error:', {
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        version: '3.0',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Locate matching purchase orders for the received item
 * v3.0: Uses flexible status matching
 */
async function locateMatchingPurchaseOrders(
  supabase: any,
  userId: string,
  item: ReceivedItemData
) {
  const { data: pos, error } = await supabase
    .from('po_orders')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'ordered'])
    .or(`asin.eq.${item.asin || 'none'},sku_code.eq.${item.sku_code || 'none'},model_number.eq.${item.model_number || 'none'}`)
    .order('expected_delivery', { ascending: true });

  if (error) {
    console.error('[SR v3.0] PO query error:', error);
    throw error;
  }

  return pos || [];
}

/**
 * Compute how to allocate received quantity across matching POs
 * v3.0: Improved allocation logic
 */
function computeQuantityAllocation(
  receivedQuantity: number,
  matchingPOs: any[]
) {
  const allocations = [];
  let remainingQty = receivedQuantity;

  for (const po of matchingPOs) {
    if (remainingQty <= 0) break;

    const neededQty = po.quantity;
    const allocatedQty = Math.min(remainingQty, neededQty);

    allocations.push({
      po: po,
      quantity: allocatedQty
    });

    remainingQty -= allocatedQty;
  }

  return {
    allocations,
    remainingQuantity: remainingQty
  };
}

/**
 * Execute PO fulfillment by updating status and recording history
 * v3.0: Enhanced status transitions
 */
async function executePOFulfillment(
  supabase: any,
  po: any,
  fulfilledQuantity: number,
  userId: string
) {
  const newStatus = fulfilledQuantity >= po.quantity ? 'delivered' : 'shipped';

  await supabase
    .from('po_orders')
    .update({ status: newStatus })
    .eq('id', po.id);

  await supabase.from('fulfillment_history').insert({
    user_id: userId,
    po_id: po.id,
    po_number: po.po_number,
    sku_code: po.sku_code,
    quantity_fulfilled: fulfilledQuantity,
    fulfillment_type: 'stock_receiving'
  });

  console.log('[SR v3.0] PO fulfilled:', {
    poNumber: po.po_number,
    quantity: fulfilledQuantity,
    newStatus: newStatus
  });
}

/**
 * Update inventory stock levels
 * v3.0: CRITICAL FIX - Flexible status matching
 */
async function updateInventoryStock(
  supabase: any,
  item: ReceivedItemData,
  quantityToAdd: number,
  userId: string
) {
  const itemIdentifier = item.asin || item.sku_code || item.model_number;
  
  console.log('[SR v3.0] Searching inventory for item:', {
    identifier: itemIdentifier,
    country: item.country,
    quantityToAdd: quantityToAdd
  });

  // Try to find in asin_inventory with FLEXIBLE STATUS MATCHING
  const { data: inventoryItem, error: inventoryError } = await supabase
    .from('asin_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('country', item.country)
    .in('status', ['in-stock', 'ordered', 'processing']) // ✅ KEY FIX - Accept multiple statuses
    .or(`asin.eq.${item.asin || 'none'},sku.eq.${item.sku_code || 'none'},model_number.eq.${item.model_number || 'none'}`)
    .limit(1)
    .single();

  if (inventoryError && inventoryError.code !== 'PGRST116') {
    console.error('[SR v3.0] Inventory query error:', inventoryError);
    throw inventoryError;
  }

  if (!inventoryItem) {
    const errorMsg = `Item ${itemIdentifier} not found in ${item.country} inventory with acceptable status (in-stock, ordered, or processing). Please add the item to inventory first before receiving stock.`;
    console.error('[SR v3.0] Item not found:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[SR v3.0] Item found in inventory:', {
    id: inventoryItem.id,
    currentQty: inventoryItem.quantity,
    currentStatus: inventoryItem.status,
    willUpdate: true
  });

  const newQuantity = inventoryItem.quantity + quantityToAdd;

  await supabase
    .from('asin_inventory')
    .update({ 
      quantity: newQuantity,
      status: 'in-stock',
      last_restock_date: new Date().toISOString()
    })
    .eq('id', inventoryItem.id);

  await supabase.from('stock_changes').insert({
    inventory_id: inventoryItem.id,
    inventory_type: 'asin',
    change_amount: quantityToAdd,
    change_type: 'stock_received',
    reason: 'Stock receiving session',
    previous_quantity: inventoryItem.quantity,
    new_quantity: newQuantity
  });

  console.log('[SR v3.0] Inventory updated successfully:', {
    itemId: inventoryItem.id,
    previousQty: inventoryItem.quantity,
    addedQty: quantityToAdd,
    newQty: newQuantity
  });
}
