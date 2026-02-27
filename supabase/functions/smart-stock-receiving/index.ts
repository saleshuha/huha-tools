/**
 * Smart Stock Receiving System - Edge Function
 * Version: 3.1 - Simplified PO Processing
 * Date: 2025-11-15
 * 
 * Changes in v3.1:
 * - Simplified PO processing: Mark as printed instead of complex fulfillment
 * - Removed status changes and fulfillment_history tracking
 * - is_printed = true now means "received/processed"
 * 
 * Previous Changes (v3.0):
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

interface ManualPOAllocation {
  po_number: string;  // Primary identifier - backend will find matching item
  quantity: number;
  priority?: number;
}

interface RequestPayload {
  items: ReceivedItemData[];
  auto_fulfill?: boolean;
  session_notes?: string;
  session_id?: string;
  country?: string;
  test?: boolean;
  manual_po_allocations?: ManualPOAllocation[];
}

serve(async (req) => {
  console.log('[SR v3.1] Incoming request:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[SR v3.1] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[SR v3.1] Supabase configuration:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey 
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('[SR v3.1] Authorization header:', { 
      present: !!authHeader, 
      prefix: authHeader?.substring(0, 20) + '...' 
    });

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    console.log('[SR v3.1] User authentication:', { 
      success: !!user, 
      userId: user?.id,
      error: authError?.message 
    });

    if (authError || !user) {
      throw new Error(`Authentication failed: ${authError?.message || 'Unknown error'}`);
    }

    // Parse request body
    const body: RequestPayload = await req.json();
    
    console.log('[SR v3.1] Request payload parsed:', {
      hasItems: !!body.items,
      itemCount: body.items?.length,
      autoFulfill: body.auto_fulfill,
      hasSessionId: !!body.session_id,
      country: body.country,
      isTest: body.test
    });

    // Test endpoint
    if (body.test) {
      console.log('[SR v3.1] ✅ Test request successful');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Smart Stock Receiving v3.1 is operational',
          version: '3.1',
          timestamp: new Date().toISOString(),
          features: ['simplified-po-marking', 'flexible-status', 'enhanced-logging']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.items || body.items.length === 0) {
      throw new Error('No items provided for processing');
    }

    const { items, auto_fulfill = true, session_notes, session_id, country, manual_po_allocations } = body;

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

    // PHASE 1 & 2: Fast validation and immediate response preparation
    const startTime = Date.now();
    console.log('[SR v3.1 PERF] Starting fast validation phase');
    
    // Validate and prepare all items first (fast path)
    const itemPreparations = await Promise.all(items.map(async (item) => {
      const enrichedItem = { ...item, country: targetCountry };
      
      // Resolve manual allocations if provided
      let resolvedAllocations: Array<{po_id: string, po_number: string, quantity: number, priority: number}> = [];
      
      const itemManualAllocations = manual_po_allocations?.filter(alloc => 
        alloc.po_id || alloc.po_number
      );

      if (itemManualAllocations && itemManualAllocations.length > 0) {
        // Fetch and validate manual POs immediately - query by PO number, match by item
        for (const manualAlloc of itemManualAllocations) {
          const { data: matchingPOs } = await supabase
            .from('po_orders')
            .select('*')
            .eq('po_number', manualAlloc.po_number)
            .eq('user_id', user.id);

          // Find the specific item that matches the received item
          const po = matchingPOs?.find(p => 
            p.asin === item.asin ||
            p.sku_code === item.sku_code ||
            p.model_number === item.model_number
          );

          if (po) {
            const allocation = {
              po_id: po.id,
              po_number: po.po_number,
              quantity: manualAlloc.quantity,
              priority: po.priority || 3
            };
            
            resolvedAllocations.push(allocation);
            
            // ✅ Manual allocation confirmation with item matching details
            console.log(`✅ [SR v3.1] Manual allocation confirmed:`, {
              po_number: po.po_number,
              matched_item: { id: po.id, asin: po.asin, sku: po.sku_code },
              priority: po.priority || 3
            });
          }
        }
      }
      
      // Fast PO lookup for auto-matching fallback
      const poQuery = supabase
        .from('po_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('country', targetCountry)
        .in('status', ['pending', 'placed', 'shipped']);

      if (item.asin) poQuery.or(`asin.eq.${item.asin}`);
      if (item.sku_code) poQuery.or(`sku_code.eq.${item.sku_code}`);
      if (item.model_number) poQuery.or(`model_number.eq.${item.model_number}`);

      const { data: matchingPOs } = await poQuery.limit(20);
      
      // If no manual allocations, try auto-matching immediately
      if (resolvedAllocations.length === 0 && matchingPOs && matchingPOs.length > 0) {
        // Sort by priority (highest first - lower number = higher priority)
        const sortedPOs = matchingPOs.sort((a, b) => (a.priority || 3) - (b.priority || 3));
        
        // Allocate to highest priority PO
        const topPO = sortedPOs[0];
        const availableQty = (topPO.quantity || 0) - (topPO.printed_quantity || 0);
        
        if (availableQty > 0) {
          resolvedAllocations.push({
            po_id: topPO.id,
            po_number: topPO.po_number,
            quantity: Math.min(item.quantity, availableQty),
            priority: topPO.priority || 3
          });
          
          console.log('[SR v3.1] Auto-matched in validation:', {
            po_number: topPO.po_number,
            quantity: resolvedAllocations[0].quantity,
            priority: topPO.priority
          });

          // ✅ Validation confirmation with full details
          console.log(`✅ [SR v3.1] CONFIRMED allocation:`, {
            item: {
              asin: item.asin,
              sku: item.sku_code,
              quantity: item.quantity
            },
            allocation: {
              po_id: topPO.id,
              po_number: topPO.po_number,
              priority: topPO.priority || 3,
              allocated_qty: resolvedAllocations[0].quantity
            }
          });
        }
      }
      
      return {
        item: enrichedItem,
        // ✅ If manual allocations were resolved, only return those POs
        // This prevents auto-matched POs from interfering with manual selection
        potentialPOs: resolvedAllocations.length > 0 
          ? matchingPOs?.filter(po => 
              resolvedAllocations.some(alloc => alloc.po_id === po.id)
            ) || []
          : matchingPOs || [],
        manualAllocations: itemManualAllocations || [],
        resolvedAllocations: resolvedAllocations
      };
    }));

    console.log('[SR v3.1 PERF] Validation complete:', { 
      duration: Date.now() - startTime,
      itemCount: items.length 
    });

    // PHASE 2: Return immediate response
    const validationResults = itemPreparations.map(prep => ({
      item_id: prep.item.asin || prep.item.sku_code || prep.item.model_number,
      matched_pos_count: prep.potentialPOs.length,
      matched_pos: prep.resolvedAllocations.length > 0 
        ? prep.resolvedAllocations.map(alloc => alloc.po_number)
        : [],
      status: 'processing',
      success: true,
      message: prep.resolvedAllocations.length > 0
        ? `Item allocated to ${prep.resolvedAllocations.length} PO(s)`
        : 'Item will be added to inventory'
    }));

    // Background processing function
    const processItemsInBackground = async () => {
      const processingResults = [];
      let totalAllocatedToPOs = 0;
      let totalAddedToInventory = 0;

      // PHASE 1: Process all items with parallel operations
      for (const prep of itemPreparations) {
        const { item, potentialPOs, manualAllocations } = prep;
        
        console.log('[SR v3.1 BG] Processing item:', {
          asin: item.asin,
          sku: item.sku_code,
          model: item.model_number,
          quantity: item.quantity
        });

        try {
          let allocations: any[] = [];
          let remainingQuantity = item.quantity;

        // Check if manual PO allocations are provided for this item
        const itemManualAllocations = manual_po_allocations?.filter(alloc => {
          // We'll validate against actual POs in the next step
          return true; // Initial filter - will validate below
        });

        if (itemManualAllocations && itemManualAllocations.length > 0) {
          console.log('[SR v3.1] Using manual PO allocations:', itemManualAllocations);

          // Validate and fetch manually selected POs - query by PO number, match by item
          for (const manualAlloc of itemManualAllocations) {
            // Step 1: Find all items in the specified PO
            const { data: matchingPOs, error: poError } = await supabase
              .from('po_orders')
              .select('*')
              .eq('po_number', manualAlloc.po_number)
              .eq('user_id', user.id)
              .in('status', ['pending', 'placed', 'shipped']);

            if (poError || !matchingPOs || matchingPOs.length === 0) {
              const errorMsg = `Manual PO ${manualAlloc.po_number} not found or all items closed. Error: ${poError?.message}`;
              console.error('[SR v3.1] ❌ Manual PO validation failed:', errorMsg);
              throw new Error(errorMsg);
            }

            // Step 2: Find the specific item that matches the received item
            const po = matchingPOs.find(p => 
              p.asin === item.asin ||
              p.sku_code === item.sku_code ||
              p.model_number === item.model_number
            );

            if (!po) {
              const errorMsg = `No matching item found in PO ${manualAlloc.po_number} for item ${item.asin || item.sku_code || item.model_number}. Available items: ${matchingPOs.map(p => p.asin || p.sku_code).join(', ')}`;
              console.error('[SR v3.1] ❌ PO item mismatch:', errorMsg);
              throw new Error(errorMsg);
            }

            console.log('[SR v3.1] 🎯 Item Match Found:', {
              received_item: {
                asin: item.asin,
                sku: item.sku_code,
                model: item.model_number
              },
              matched_po_item: {
                id: po.id,
                asin: po.asin,
                sku: po.sku_code,
                status: po.status,
                is_printed: po.is_printed
              },
              po_number: manualAlloc.po_number
            });

            allocations.push({
              po: po,
              quantity: manualAlloc.quantity
            });

            remainingQuantity -= manualAlloc.quantity;
          }

          console.log('[SR v3.1] Manual allocation complete:', {
            allocations: allocations.length,
            remainingQty: remainingQuantity
          });
        } else {
          // Use automatic matching (existing logic)
          const matchingPOs = await locateMatchingPurchaseOrders(supabase, user.id, item);
          
          console.log('[SR v3.1] Matching POs found (auto):', { 
            count: matchingPOs.length,
            poNumbers: matchingPOs.map(po => po.po_number)
          });

          // Calculate allocation
          const allocationResult = computeQuantityAllocation(
            item.quantity,
            matchingPOs
          );
          
          allocations = allocationResult.allocations;
          remainingQuantity = allocationResult.remainingQuantity;
        }

        console.log('[SR v3.1] Allocation computed:', {
          totalAllocations: allocations.length,
          remainingQty: remainingQuantity
        });

        // Mark POs as printed if auto-fulfill enabled
        if (auto_fulfill && allocations.length > 0) {
          for (const allocation of allocations) {
            await markPOAsPrinted(supabase, allocation.po, allocation.quantity, user.id, item.serial_number);
            totalAllocatedToPOs += allocation.quantity;
          }
        }

        // ✅ ALWAYS update inventory with the FULL received quantity
        // PO allocation is for label tracking — inventory must always reflect physical stock
        console.log('[SR v3.1] Updating inventory stock:', {
          asin: item.asin,
          sku: item.sku_code,
          quantity: item.quantity,
          allocatedToPOs: allocations.length,
          reason: 'Inventory always updated regardless of PO allocation'
        });
        
        try {
          await updateInventoryStock(supabase, item, item.quantity, user.id);
          totalAddedToInventory += item.quantity;
        } catch (invError) {
          console.error('[SR v3.1] ❌ Inventory update failed (non-fatal):', {
            asin: item.asin,
            error: invError.message
          });
          // Don't throw — PO marking was already done, just log the failure
        }

        // Record receiving event with proper error handling
        try {
          const { error: receivingItemError } = await supabase.from('stock_receiving_items').insert({
            session_id: activeSessionId,
            user_id: user.id,
            asin: item.asin,
            sku_code: item.sku_code,
            model_number: item.model_number,
            title: item.title,
            quantity_received: item.quantity,
            quantity_allocated_to_pos: item.quantity - remainingQuantity,
            quantity_added_to_inventory: item.quantity,
            matched_pos: allocations.map(a => ({
              po_number: a.po.po_number,
              quantity: a.quantity,
              po_id: a.po.id
            })),
            has_pending_po: allocations.length > 0,
            status: 'completed',
            supplier_name: item.supplier_name,
            receiving_notes: item.notes,
            serial_number: item.serial_number
          });

          if (receivingItemError) {
            console.error('[SR v3.0] ❌ Failed to insert receiving item:', {
              error: receivingItemError,
              item: { asin: item.asin, sku: item.sku_code, model: item.model_number }
            });
          }
        } catch (err) {
          console.error('[SR v3.0] ❌ Exception inserting receiving item:', err);
        }

        // Log to receiving history with proper error handling
        try {
          // Fetch priorities and group info for allocated POs
          const priorities: number[] = [];
          const groupNames: string[] = [];
          const groupIds: string[] = [];
          
          if (allocations.length > 0) {
            const poIds = allocations.map(a => a.po.id);
            
            // Get priorities from po_orders
            const { data: poData } = await supabase
              .from('po_orders')
              .select('id, priority')
              .in('id', poIds);
            
            const priorityMap = new Map(poData?.map(po => [po.id, po.priority]) || []);
            
            console.log('[SR v3.0] Fetched priorities for POs:', {
              poIds,
              priorities: poData?.map(po => ({ id: po.id, priority: po.priority }))
            });
            
            // Get group info from po_group_members and po_groups - explicit two-step fetch
            const { data: groupMembers } = await supabase
              .from('po_group_members')
              .select('po_id, group_id')
              .in('po_id', poIds);
            
            // Then fetch group names separately
            const groupIds_temp = groupMembers?.map(gm => gm.group_id).filter(Boolean) || [];
            const { data: groups } = await supabase
              .from('po_groups')
              .select('id, group_name')
              .in('id', groupIds_temp);
            
            const groupInfoMap = new Map(
              groups?.map(g => [g.id, g.group_name]) || []
            );
            
            const groupMap = new Map(
              groupMembers?.map(gm => [
                gm.po_id,
                {
                  groupId: gm.group_id,
                  groupName: groupInfoMap.get(gm.group_id)
                }
              ]) || []
            );
            
            console.log('[SR v3.0] Fetched group info:', {
              groupMembers: groupMembers?.length || 0,
              groups: groups?.length || 0,
              groupMap: Array.from(groupMap.entries())
            });
            
            // Build arrays matching allocation order
            allocations.forEach(a => {
              priorities.push(priorityMap.get(a.po.id) || 3);
              const groupInfo = groupMap.get(a.po.id);
              if (groupInfo) {
                groupNames.push(groupInfo.groupName);
                groupIds.push(groupInfo.groupId);
              }
            });
            
            console.log('[SR v3.0] Saving history with metadata:', {
              po_numbers: allocations.map(a => a.po.po_number),
              priorities_count: priorities.length,
              priorities,
              group_names_count: groupNames.length,
              group_names: groupNames
            });
          }
          
          const { error: historyError } = await supabase.from('receiving_history').insert({
            user_id: user.id,
            asin: item.asin,
            sku_code: item.sku_code,
            model_number: item.model_number,
            title: item.title,
            quantity: item.quantity,
            serial_number: item.serial_number,
            supplier_name: item.supplier_name,
            destination_type: remainingQuantity > 0 ? 'inventory' : 'po_fulfillment',
            destination_details: {
              inventory_added: remainingQuantity,
              pos_allocated: allocations.length,
              po_numbers: allocations.map(a => a.po.po_number),
              priorities: priorities.length > 0 ? priorities : undefined,
              group_names: groupNames.length > 0 ? groupNames : undefined,
              group_ids: groupIds.length > 0 ? groupIds : undefined
            },
            success: true
          });

          if (historyError) {
            console.error('[SR v3.0] ❌ Failed to insert receiving history:', {
              error: historyError,
              item: { asin: item.asin, sku: item.sku_code, model: item.model_number }
            });
          }
        } catch (err) {
          console.error('[SR v3.0] ❌ Exception inserting receiving history:', err);
        }

          processingResults.push({
            item_id: item.asin || item.sku_code || item.model_number,
            success: true,
            allocated_to_pos: allocations.length,
            allocated_quantity: item.quantity - remainingQuantity,
            added_to_inventory: remainingQuantity,
            matched_pos: allocations.map(a => ({
              po_number: a.po.po_number,
              priority: a.po.priority || 3
            }))
          });

        } catch (itemError) {
          console.error('[SR v3.1 BG] ❌ Item processing error:', {
            item: item,
            error: itemError.message
          });

          processingResults.push({
            item_id: item.asin || item.sku_code || item.model_number,
            success: false,
            error: itemError.message,
            message: `Failed to process: ${itemError.message}`
          });
        }
      }

      // PHASE 3: Update session once at the end (not per-item)
      console.log('[SR v3.1 BG] Updating session statistics:', {
        sessionId: activeSessionId,
        totalItems: items.length,
        duration: Date.now() - startTime
      });

      await supabase
        .from('stock_receiving_sessions')
        .update({
          total_items_received: items.length,
          items_allocated_to_pos: totalAllocatedToPOs,
          items_added_to_inventory: totalAddedToInventory,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSessionId);

      console.log('[SR v3.1 BG] ✅ Background processing complete:', {
        duration: Date.now() - startTime,
        results: processingResults.length
      });
    };

    // PHASE 2: Start background processing without blocking response
    EdgeRuntime.waitUntil(processItemsInBackground());

    // PHASE 2: Return immediate optimistic response
    const immediateResponse = {
      session_id: activeSessionId,
      results: validationResults.map((result, index) => ({
        ...result,
        manual_po_allocations: itemPreparations[index].resolvedAllocations
      })),
    summary: {
      total_items: items.length,
      status: 'processing',
      estimated_pos: itemPreparations.reduce((sum, p) => sum + p.potentialPOs.length, 0),
      // ✅ Calculate accurate counts from validation results
      items_allocated_to_pos: validationResults.filter(r => 
        r.matched_pos && r.matched_pos.length > 0
      ).length,
      items_added_to_inventory: validationResults.filter(r => 
        !r.matched_pos || r.matched_pos.length === 0
      ).length
    },
      optimistic: true,
      processing_time_ms: Date.now() - startTime
    };

    console.log('[SR v3.1 PERF] ✅ Immediate response sent:', {
      duration: Date.now() - startTime,
      itemCount: items.length
    });

    return new Response(
      JSON.stringify(immediateResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SR v3.1] ❌ Request processing error:', {
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
    .in('status', ['pending', 'placed'])
    .or(`asin.eq.${item.asin || 'none'},sku_code.eq.${item.sku_code || 'none'},model_number.eq.${item.model_number || 'none'}`)
    .order('priority', { ascending: true })
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
 * Mark PO as printed/received when stock is received
 * v3.1: Simplified - just mark as printed instead of complex fulfillment
 */
async function markPOAsPrinted(
  supabase: any,
  po: any,
  receivedQuantity: number,
  userId: string,
  serialNumber?: string
) {
  const notesText = serialNumber 
    ? `Received: ${serialNumber} (Qty: ${receivedQuantity})`
    : `Received (Qty: ${receivedQuantity})`;

  const newPrintedQuantity = (po.printed_quantity || 0) + receivedQuantity;
  
  // Determine if PO is fully received
  const isFullyReceived = newPrintedQuantity >= po.quantity;
  const newStatus = isFullyReceived ? 'closed' : po.status;

  await supabase
    .from('po_orders')
    .update({ 
      is_printed: true,
      printed_quantity: newPrintedQuantity,
      label_printed_at: new Date().toISOString(),
      status: newStatus,
      notes: po.notes ? `${po.notes}\n${notesText}` : notesText
    })
    .eq('id', po.id);

  console.log('[SR v3.1] PO marked as printed/received:', {
    poNumber: po.po_number,
    previousPrintedQty: po.printed_quantity || 0,
    receivedQuantity: receivedQuantity,
    newPrintedQty: newPrintedQuantity,
    newStatus: newStatus,
    isFullyReceived: isFullyReceived,
    serialNumber: serialNumber
  });

  // Verify the update
  const { data: updatedPO } = await supabase
    .from('po_orders')
    .select('id, po_number, printed_quantity, is_printed, status')
    .eq('id', po.id)
    .single();

  console.log('[SR v3.1] ✅ PO update verified:', {
    poNumber: updatedPO?.po_number,
    isPrinted: updatedPO?.is_printed,
    printedQuantity: updatedPO?.printed_quantity,
    status: updatedPO?.status
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

  // Try to find in asin_inventory - ALLOW ALL STATUSES for receiving
  const { data: inventoryItem, error: inventoryError } = await supabase
    .from('asin_inventory')
    .select('*')
    .eq('user_id', userId)
    .eq('country', item.country)
    // ✅ REMOVED status filter - allow receiving for items in ANY status (sold, in-stock, ordered, no-stock)
    .or(`asin.eq.${item.asin || 'none'},sku.eq.${item.sku_code || 'none'}`)
    .or('is_active.is.null,is_active.eq.true')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (inventoryError && inventoryError.code !== 'PGRST116') {
    console.error('[SR v3.0] Inventory query error:', inventoryError);
    throw inventoryError;
  }

  if (!inventoryItem) {
    const errorMsg = `Item ${itemIdentifier} not found in ${item.country} inventory. Please add the item to inventory first before receiving stock.`;
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

  const { error: updateError } = await supabase
    .from('asin_inventory')
    .update({ 
      quantity: newQuantity,
      status: 'in-stock',
      is_active: true,
      last_restock_date: new Date().toISOString()
    })
    .eq('id', inventoryItem.id);

  if (updateError) {
    console.error('[SR v3.0] ❌ Inventory update failed:', {
      itemId: inventoryItem.id,
      error: updateError
    });
    throw updateError;
  }

  console.log('[SR v3.0] ✅ Inventory database update confirmed:', {
    itemId: inventoryItem.id,
    previousQty: inventoryItem.quantity,
    addedQty: quantityToAdd,
    newQty: newQuantity
  });

  // Record stock change in history with CORRECT column names
  const { error: stockChangeError } = await supabase.from('stock_changes').insert({
    user_id: userId,
    inventory_id: inventoryItem.id,
    inventory_type: 'asin',
    asin: item.asin || null,
    sku_number: item.sku_code || null,
    serial_number: item.serial_number || null,
    change_amount: quantityToAdd,
    change_reason: 'stock_receiving',
    reference_type: 'stock_receiving',
    previous_quantity: inventoryItem.quantity,
    new_quantity: newQuantity,
    notes: 'Stock received via receiving session',
    source_type: 'stock_receiving',
    changed_by: userId
  });

  if (stockChangeError) {
    console.error('[SR v3.0] ❌ Failed to create stock_changes record:', {
      error: stockChangeError,
      itemId: inventoryItem.id,
      asin: item.asin
    });
    throw new Error(`Failed to record stock change: ${stockChangeError.message}`);
  }

  console.log('[SR v3.0] ✅ Stock change recorded in history:', {
    inventoryId: inventoryItem.id,
    changeAmount: quantityToAdd,
    newQuantity: newQuantity
  });

  console.log('[SR v3.0] Inventory updated successfully:', {
    itemId: inventoryItem.id,
    previousQty: inventoryItem.quantity,
    addedQty: quantityToAdd,
    newQty: newQuantity
  });
}
