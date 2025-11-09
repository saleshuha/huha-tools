import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceivedItem {
  asin?: string;
  sku_code?: string;
  model_number?: string;
  quantity: number;
  serial_number?: string;
  supplier_name?: string;
  notes?: string;
  title?: string;
}

interface RequestBody {
  items: ReceivedItem[];
  auto_fulfill?: boolean;
  session_notes?: string;
  session_id?: string;
  country?: string;
}

serve(async (req) => {
  console.log('[Edge Function] Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[Edge Function] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('[Edge Function] Supabase configured:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    console.log('[Edge Function] Auth header:', { 
      hasAuth: !!authHeader,
      authPrefix: authHeader?.substring(0, 20) 
    });
    
    if (!authHeader) {
      console.error('[Edge Function] No authorization header');
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    console.log('[Edge Function] User authentication:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError?.message
    });

    if (userError || !user) {
      console.error('[Edge Function] Unauthorized:', userError);
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    console.log('[Edge Function] Request body parsed:', {
      hasItems: !!body.items,
      itemCount: body.items?.length,
      autoFulfill: body.auto_fulfill,
      hasSessionId: !!body.session_id,
      isTest: !!(body as any).test
    });
    
    // Handle test/health check requests
    if ((body as any).test) {
      console.log('[Edge Function] ✅ Test request successful');
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'Edge function is deployed and accessible',
          timestamp: new Date().toISOString(),
          userId: user.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    const { items, auto_fulfill = true, session_notes, session_id, country } = body;

    console.log(`[Edge Function] Processing ${items.length} items for user ${user.id}`, {
      autoFulfill: auto_fulfill,
      hasSessionId: !!session_id,
      country: country
    });

    // Use country from request, fallback to profile country, then default to KSA
    let userCountry = country;
    
    if (!userCountry) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();
      userCountry = userProfile?.country || 'KSA';
    }
    
    console.log('[Edge Function] Using country:', userCountry, 'from:', country ? 'request' : 'profile');

    // Create or get session
    let sessionId = session_id;
    if (!sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('stock_receiving_sessions')
        .insert({
          user_id: user.id,
          notes: session_notes,
          status: 'in_progress'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      sessionId = session.id;
    }

    const results = [];

    for (const item of items) {
      try {
        console.log('[Edge Function] Processing item:', {
          asin: item.asin,
          sku: item.sku_code,
          model: item.model_number,
          quantity: item.quantity
        });
        
        // Step 1: Find matching POs
        const matchingPOs = await findMatchingPOs(supabase, user.id, item);
        console.log(`[Edge Function] Found ${matchingPOs.length} matching POs for item`, {
          poNumbers: matchingPOs.map(po => po.po_number)
        });

        // Step 2: Calculate allocation
        const allocation = calculateAllocation(item.quantity, matchingPOs);
        console.log(`[Edge Function] Allocation calculated:`, {
          allocationsCount: allocation.allocations.length,
          remainingQty: allocation.remainingQty,
          allocations: allocation.allocations
        });

        // Step 3: Execute allocation if auto_fulfill is true
        if (auto_fulfill) {
          // Fulfill POs
          for (const alloc of allocation.allocations) {
            await fulfillPO(supabase, user.id, alloc);
          }

          // Add remaining to inventory
          let inventoryId = null;
          if (allocation.remainingQty > 0) {
            inventoryId = await addToInventory(supabase, user.id, item, allocation.remainingQty, userCountry);
          }

          // Record the receiving item
          await supabase.from('stock_receiving_items').insert({
            session_id: sessionId,
            user_id: user.id,
            asin: item.asin,
            sku_code: item.sku_code,
            model_number: item.model_number,
            serial_number: item.serial_number,
            title: item.title,
            quantity_received: item.quantity,
            quantity_allocated_to_pos: item.quantity - allocation.remainingQty,
            quantity_added_to_inventory: allocation.remainingQty,
            matched_pos: allocation.allocations,
            has_pending_po: allocation.allocations.length > 0,
            status: 'completed',
            supplier_name: item.supplier_name,
            receiving_notes: item.notes
          });

          // Determine template type based on allocations
          const templateType = allocation.allocations.length > 0 ? 'po' : 'inventory';
          
          results.push({
            item_id: item.asin || item.sku_code || item.model_number,
            matched_pos: allocation.allocations,
            quantity_to_inventory: allocation.remainingQty,
            inventory_id: inventoryId,
            success: true,
            template_type: templateType,
            template_data: {
              asin: item.asin,
              sku_code: item.sku_code,
              model_number: item.model_number,
              title: item.title,
              quantity: item.quantity,
              po_numbers: allocation.allocations.map(a => a.po_number),
              serial_number: item.serial_number,
              status: allocation.allocations.length > 0 ? 'Delivered' : 'In Stock'
            },
            message: `Allocated ${item.quantity - allocation.remainingQty} to ${allocation.allocations.length} PO(s), added ${allocation.remainingQty} to inventory`
          });

          // Log to receiving history for comprehensive tracking
          try {
            const { error: historyError } = await supabase.from('receiving_history').insert({
              user_id: user.id,
              asin: item.asin,
              sku_code: item.sku_code,
              model_number: item.model_number,
              title: item.title,
              quantity: item.quantity,
              serial_number: item.serial_number,
              supplier_name: item.supplier_name,
              country: userCountry,
              destination_type: allocation.allocations.length > 0 ? 'po' : 'inventory',
              destination_details: allocation.allocations.length > 0 
                ? { po_numbers: allocation.allocations.map(a => a.po_number) }
                : {},
              success: true
            });

            if (historyError) {
              console.error('[Edge Function] Failed to log history:', historyError);
              // Don't throw - receiving was successful, just logging failed
            }
          } catch (histError) {
            console.error('[Edge Function] Exception logging history:', histError);
          }
        } else {
          // Just return the allocation plan without executing
          results.push({
            item_id: item.asin || item.sku_code || item.model_number,
            matched_pos: allocation.allocations,
            quantity_to_inventory: allocation.remainingQty,
            success: true,
            message: 'Allocation plan ready (not executed)'
          });
        }
      } catch (error) {
        console.error(`[Edge Function] ❌ Error processing item:`, {
          item: item,
          error: error.message,
          stack: error.stack
        });
        results.push({
          item_id: item.asin || item.sku_code || item.model_number,
          success: false,
          error: error.message,
          message: `Failed to process: ${error.message}`
        });
      }
    }

    // Update session statistics
    const totalAllocatedToPOs = results.reduce((sum, r) => sum + (r.matched_pos?.length || 0), 0);
    const totalAddedToInventory = results.reduce((sum, r) => sum + (r.quantity_to_inventory || 0), 0);

    console.log('[Edge Function] Updating session statistics:', {
      sessionId,
      totalItems: items.length,
      allocatedToPOs: totalAllocatedToPOs,
      addedToInventory: totalAddedToInventory
    });

    await supabase
      .from('stock_receiving_sessions')
      .update({
        total_items_received: items.length,
        items_allocated_to_pos: totalAllocatedToPOs,
        items_added_to_inventory: totalAddedToInventory,
        status: 'completed'
      })
      .eq('id', sessionId);

    const response = {
      session_id: sessionId,
      results,
      summary: {
        total_items: items.length,
        items_allocated_to_pos: totalAllocatedToPOs,
        items_added_to_inventory: totalAddedToInventory
      }
    };

    console.log('[Edge Function] ✅ Processing complete, returning response:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('[Edge Function] ❌ Fatal error:', {
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function findMatchingPOs(supabase: any, userId: string, item: ReceivedItem) {
  const query = supabase
    .from('po_orders')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'ordered', 'shipped']);

  // Build OR conditions for matching
  const orConditions = [];
  if (item.asin) orConditions.push(`asin.eq.${item.asin}`);
  if (item.sku_code) orConditions.push(`sku_code.eq.${item.sku_code}`);
  if (item.model_number) orConditions.push(`model_number.eq.${item.model_number}`);

  if (orConditions.length > 0) {
    query.or(orConditions.join(','));
  }

  const { data, error } = await query.order('expected_delivery', { ascending: true });

  if (error) throw error;
  return data || [];
}

function calculateAllocation(quantityReceived: number, matchingPOs: any[]) {
  let remainingQty = quantityReceived;
  const allocations = [];

  for (const po of matchingPOs) {
    if (remainingQty <= 0) break;

    const qtyToAllocate = Math.min(remainingQty, po.quantity);
    allocations.push({
      po_id: po.id,
      po_number: po.po_number,
      quantity_needed: po.quantity,
      quantity_allocated: qtyToAllocate,
      status: qtyToAllocate >= po.quantity ? 'fulfilled' : 'partial'
    });

    remainingQty -= qtyToAllocate;
  }

  return {
    allocations,
    remainingQty
  };
}

async function fulfillPO(supabase: any, userId: string, allocation: any) {
  // Update PO status to closed/delivered
  const { error: poError } = await supabase
    .from('po_orders')
    .update({
      status: allocation.status === 'fulfilled' ? 'delivered' : 'shipped',
      notes: `Fulfilled from incoming stock: ${allocation.quantity_allocated} units`,
      updated_at: new Date().toISOString()
    })
    .eq('id', allocation.po_id);

  if (poError) throw poError;

  // Log fulfillment history
  const { error: historyError } = await supabase
    .from('fulfillment_history')
    .insert({
      user_id: userId,
      po_number: allocation.po_number,
      fulfilled_quantity: allocation.quantity_allocated,
      original_quantity: allocation.quantity_needed,
      fulfillment_source: 'incoming_stock',
      notes: `Auto-fulfilled via smart stock receiving`
    });

  if (historyError) throw historyError;
}

async function addToInventory(supabase: any, userId: string, item: ReceivedItem, quantity: number, country: string) {
  // Step 1: Check if item already exists in the specified country
  const { data: existing } = await supabase
    .from('asin_inventory')
    .select('id, quantity, serial_number, country, asin, sku, title')
    .eq('user_id', userId)
    .eq('asin', item.asin || 'N/A')
    .eq('country', country)
    .in('status', ['in-stock', 'ordered', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    // Item does not exist - throw error instead of creating
    const identifier = item.asin || item.sku_code || item.model_number || 'Unknown';
    throw new Error(
      `Item ${identifier} not found in ${country} inventory. Please add the item to inventory first before receiving stock.`
    );
  }

  // Step 2: UPDATE existing record
  const newQuantity = existing.quantity + quantity;
  const { data: updated, error: updateError } = await supabase
    .from('asin_inventory')
    .update({
      quantity: newQuantity,
      notes: `Received from supplier: ${item.supplier_name || 'N/A'}. ${item.notes || ''}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', existing.id)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  const inventoryId = existing.id;
  const serialNumber = existing.serial_number;
  
  console.log(`[Edge Function] Updated existing inventory in ${country}: ${existing.quantity} + ${quantity} = ${newQuantity}`);

  // Step 3: Create stock change record
  const { error: stockChangeError } = await supabase.from('stock_changes').insert({
    user_id: userId,
    changed_by: userId,
    inventory_id: inventoryId,
    inventory_type: 'asin',
    asin: item.asin || 'N/A',
    sku_number: item.sku_code,
    serial_number: serialNumber,
    previous_quantity: existing.quantity,
    new_quantity: newQuantity,
    change_amount: quantity,
    change_reason: 'stock_receiving',
    source_type: 'manual_adjustment',
    reference_type: 'stock_receiving',
    notes: `Received ${quantity} units via smart stock receiving from ${item.supplier_name || 'unknown supplier'} for ${country}`,
    approval_status: 'approved'
  });

  if (stockChangeError) {
    console.error('[Edge Function] Failed to create stock change:', stockChangeError);
  }

  return inventoryId;
}
