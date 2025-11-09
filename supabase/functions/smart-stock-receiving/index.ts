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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    
    // Handle test/health check requests
    if ((body as any).test) {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'Edge function is deployed and accessible' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    const { items, auto_fulfill = true, session_notes, session_id } = body;

    console.log(`Processing ${items.length} items for user ${user.id}`);

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
        // Step 1: Find matching POs
        const matchingPOs = await findMatchingPOs(supabase, user.id, item);
        console.log(`Found ${matchingPOs.length} matching POs for item`);

        // Step 2: Calculate allocation
        const allocation = calculateAllocation(item.quantity, matchingPOs);
        console.log(`Allocation: ${allocation.allocations.length} POs, ${allocation.remainingQty} to inventory`);

        // Step 3: Execute allocation if auto_fulfill is true
        if (auto_fulfill) {
          // Fulfill POs
          for (const alloc of allocation.allocations) {
            await fulfillPO(supabase, user.id, alloc);
          }

          // Add remaining to inventory
          let inventoryId = null;
          if (allocation.remainingQty > 0) {
            inventoryId = await addToInventory(supabase, user.id, item, allocation.remainingQty);
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

          results.push({
            item_id: item.asin || item.sku_code || item.model_number,
            matched_pos: allocation.allocations,
            quantity_to_inventory: allocation.remainingQty,
            inventory_id: inventoryId,
            success: true,
            message: `Allocated ${item.quantity - allocation.remainingQty} to ${allocation.allocations.length} PO(s), added ${allocation.remainingQty} to inventory`
          });
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
        console.error(`Error processing item:`, error);
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

    await supabase
      .from('stock_receiving_sessions')
      .update({
        total_items_received: items.length,
        items_allocated_to_pos: totalAllocatedToPOs,
        items_added_to_inventory: totalAddedToInventory,
        status: 'completed'
      })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        results,
        summary: {
          total_items: items.length,
          items_allocated_to_pos: totalAllocatedToPOs,
          items_added_to_inventory: totalAddedToInventory
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in smart-stock-receiving:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

async function addToInventory(supabase: any, userId: string, item: ReceivedItem, quantity: number) {
  // Generate serial number if not provided
  const serialNumber = item.serial_number || `RCV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase
    .from('asin_inventory')
    .insert({
      user_id: userId,
      asin: item.asin || 'N/A',
      sku: item.sku_code,
      serial_number: serialNumber,
      title: item.title,
      quantity: quantity,
      status: 'in-stock',
      notes: `Received from supplier: ${item.supplier_name || 'N/A'}. ${item.notes || ''}`
    })
    .select()
    .single();

  if (error) throw error;

  // Log stock change
  await supabase.from('stock_changes').insert({
    inventory_id: data.id,
    inventory_type: 'asin',
    change_amount: quantity,
    reason: 'stock_receiving',
    notes: `Received ${quantity} units via smart stock receiving`
  });

  return data.id;
}
