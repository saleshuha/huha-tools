import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, user-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const path = url.pathname;

    // POST /generate - Generate new purchase link
    if (path.endsWith('/generate') && req.method === 'POST') {
      const { poNumbers, poOrderIds, title, description, expiresInDays, userId } = await req.json();
      
      if (!userId || !poNumbers || poNumbers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      const insertData: any = {
        link_token: token,
        user_id: userId,
        po_numbers: poNumbers,
        title,
        description,
        expires_at: expiresAt
      };
      
      // Store specific item IDs if provided (selective item-level link)
      if (poOrderIds && poOrderIds.length > 0) {
        insertData.po_order_ids = poOrderIds;
      }
      
      const { data, error } = await supabaseClient
        .from('purchase_links')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating purchase link:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // GET /data/:token - Fetch PO data for link (PUBLIC)
    if (path.includes('/data/') && req.method === 'GET') {
      const token = path.split('/data/')[1];
      
      const { data: link, error: linkError } = await supabaseClient
        .from('purchase_links')
        .select('*')
        .eq('link_token', token)
        .eq('is_active', true)
        .single();
      
      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired link' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check expiration
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Link has expired' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Update access tracking
      await supabaseClient
        .from('purchase_links')
        .update({ 
          access_count: (link.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', link.id);
      
      // Fetch PO orders - use po_order_ids if available (selective), otherwise all from po_numbers
      let allPoOrders: any[] = [];
      const pageSize = 1000;
      
      const useSelectiveIds = link.po_order_ids && Array.isArray(link.po_order_ids) && link.po_order_ids.length > 0;
      
      if (useSelectiveIds) {
        // Selective mode: chunk IDs into batches of 100 to avoid URL length limits
        const idChunkSize = 100;
        for (let i = 0; i < link.po_order_ids.length; i += idChunkSize) {
          const idChunk = link.po_order_ids.slice(i, i + idChunkSize);
          let offset = 0;
          let hasMore = true;
          while (hasMore) {
            const { data: batch, error: batchError } = await supabaseClient
              .from('po_orders')
              .select('*')
              .in('id', idChunk)
              .range(offset, offset + pageSize - 1);
            
            if (batchError) {
              console.error('Error fetching PO orders batch:', batchError);
              hasMore = false;
              break;
            }
            if (batch && batch.length > 0) {
              allPoOrders = allPoOrders.concat(batch);
              offset += pageSize;
              hasMore = batch.length === pageSize;
            } else {
              hasMore = false;
            }
          }
        }
      } else {
        // Full PO mode: fetch all items from the PO numbers
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const { data: batch, error: batchError } = await supabaseClient
            .from('po_orders')
            .select('*')
            .in('po_number', link.po_numbers)
            .eq('user_id', link.user_id)
            .range(offset, offset + pageSize - 1);
          
          if (batchError) {
            console.error('Error fetching PO orders batch:', batchError);
            break;
          }
          if (batch && batch.length > 0) {
            allPoOrders = allPoOrders.concat(batch);
            offset += pageSize;
            hasMore = batch.length === pageSize;
          } else {
            hasMore = false;
          }
        }
      }
      const poOrders = allPoOrders;

      // Fetch product images in batches of 200 ASINs to avoid URL length limits
      let productImages: any[] = [];
      if (poOrders.length > 0) {
        const asins = [...new Set(poOrders.map(o => o.asin).filter(Boolean))];
        if (asins.length > 0) {
          const chunkSize = 200;
          for (let i = 0; i < asins.length; i += chunkSize) {
            const chunk = asins.slice(i, i + chunkSize);
            let imgOffset = 0;
            let imgMore = true;
            while (imgMore) {
              const { data: imgBatch } = await supabaseClient
                .from('product_images')
                .select('asin, image_url')
                .in('asin', chunk)
                .range(imgOffset, imgOffset + pageSize - 1);
              if (imgBatch && imgBatch.length > 0) {
                productImages = productImages.concat(imgBatch);
                imgOffset += pageSize;
                imgMore = imgBatch.length === pageSize;
              } else {
                imgMore = false;
              }
            }
          }
          console.log(`Fetched ${productImages.length} product images for ${asins.length} ASINs in ${Math.ceil(asins.length / chunkSize)} chunks`);
        }
      }

      // Fetch inventory metrics: shipped_orders, fba_inventory, asin_inventory by ASIN
      const asinsForMetrics = [...new Set(poOrders.map(o => o.asin).filter(Boolean))];
      
      // Build ASIN-level metrics maps
      const shippedMap: Record<string, number> = {};
      const fbaMap: Record<string, number> = {};
      const instockMap: Record<string, number> = {};
      
      if (asinsForMetrics.length > 0) {
        const metricsChunkSize = 200;
        for (let i = 0; i < asinsForMetrics.length; i += metricsChunkSize) {
          const chunk = asinsForMetrics.slice(i, i + metricsChunkSize);
          
          // Fetch shipped_orders
          const { data: shippedBatch } = await supabaseClient
            .from('shipped_orders')
            .select('asin, quantity')
            .in('asin', chunk)
            .eq('user_id', link.user_id);
          if (shippedBatch) {
            for (const row of shippedBatch) {
              shippedMap[row.asin] = (shippedMap[row.asin] || 0) + (row.quantity || 0);
            }
          }
          
          // Fetch fba_inventory
          const { data: fbaBatch } = await supabaseClient
            .from('fba_inventory')
            .select('asin, quantity')
            .in('asin', chunk)
            .eq('user_id', link.user_id);
          if (fbaBatch) {
            for (const row of fbaBatch) {
              fbaMap[row.asin] = (fbaMap[row.asin] || 0) + (row.quantity || 0);
            }
          }
          
          // Fetch asin_inventory (active items with quantity > 0)
          const { data: invBatch } = await supabaseClient
            .from('asin_inventory')
            .select('asin, quantity')
            .in('asin', chunk)
            .eq('user_id', link.user_id)
            .eq('is_active', true)
            .gt('quantity', 0);
          if (invBatch) {
            for (const row of invBatch) {
              instockMap[row.asin] = (instockMap[row.asin] || 0) + (row.quantity || 0);
            }
          }
        }
      }

      // Attach product images and metrics to orders
      const ordersWithImages = poOrders.map(order => ({
        ...order,
        product_image: productImages.find(img => img.asin === order.asin) || null,
        metrics: {
          shipped: order.asin ? (shippedMap[order.asin] || 0) : 0,
          fba: order.asin ? (fbaMap[order.asin] || 0) : 0,
          instock: order.asin ? (instockMap[order.asin] || 0) : 0,
        }
      }));
      
      // Fetch existing purchase updates with pagination
      let allUpdates: any[] = [];
      let updOffset = 0;
      let updMore = true;
      while (updMore) {
        const { data: updBatch, error: updError } = await supabaseClient
          .from('purchase_updates')
          .select('*')
          .eq('link_id', link.id)
          .range(updOffset, updOffset + pageSize - 1);
        if (updError) {
          console.error('Error fetching updates:', updError);
          break;
        }
        if (updBatch && updBatch.length > 0) {
          allUpdates = allUpdates.concat(updBatch);
          updOffset += pageSize;
          updMore = updBatch.length === pageSize;
        } else {
          updMore = false;
        }
      }
      const updates = allUpdates;
      
      return new Response(JSON.stringify({ 
        link, 
        poOrders: ordersWithImages, 
        updates: updates || [] 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // POST /update/:token - Save purchase update (PUBLIC)
    if (path.includes('/update/') && req.method === 'POST') {
      const token = path.split('/update/')[1];
      const updateData = await req.json();
      
      // Verify link is active
      const { data: link, error: linkError } = await supabaseClient
        .from('purchase_links')
        .select('id, expires_at')
        .eq('link_token', token)
        .eq('is_active', true)
        .single();
      
      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired link' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check expiration
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Link has expired' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      // Upsert purchase update with vendor and supplier details
      const { data, error } = await supabaseClient
        .from('purchase_updates')
        .upsert({
          link_id: link.id,
          po_order_id: updateData.poOrderId,
          po_number: updateData.poNumber,
          asin: updateData.asin,
          sku_code: updateData.skuCode,
          model_number: updateData.modelNumber,
          title: updateData.title,
          purchased_quantity: updateData.purchasedQuantity || 0,
          supplier_name: updateData.supplierName,
          supplier_order_number: updateData.supplierOrderNumber,
          estimated_delivery_date: updateData.estimatedDeliveryDate,
          unit_cost: updateData.unitCost,
          total_cost: updateData.totalCost,
          vendor_name: updateData.vendorName,
          vendor_email: updateData.vendorEmail,
          notes: updateData.notes,
          metadata: updateData.metadata || {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'link_id,po_order_id'
        })
        .select()
        .single();
      
      // Log activity
      await supabaseClient
        .from('purchase_link_activity')
        .insert({
          link_id: link.id,
          activity_type: 'update',
          vendor_name: updateData.vendorName,
          vendor_email: updateData.vendorEmail,
          details: {
            po_order_id: updateData.poOrderId,
            po_number: updateData.poNumber,
            purchased_quantity: updateData.purchasedQuantity,
            not_available: updateData.metadata?.not_available
          }
        });

      // Insert cost history when unit_cost is provided
      if (updateData.unitCost && updateData.unitCost > 0 && updateData.asin) {
        // Get the link's user_id for the cost history record
        const { data: linkFull } = await supabaseClient
          .from('purchase_links')
          .select('user_id')
          .eq('id', link.id)
          .single();

        if (linkFull?.user_id) {
          await supabaseClient
            .from('asin_cost_history')
            .insert({
              asin: updateData.asin,
              sku_code: updateData.skuCode || null,
              title: updateData.title || null,
              unit_cost: updateData.unitCost,
              supplier_name: updateData.supplierName || null,
              link_id: link.id,
              po_number: updateData.poNumber || null,
              recorded_date: new Date().toISOString().split('T')[0],
              user_id: linkFull.user_id,
            });
        }
      }
      
      if (error) {
        console.error('Error saving update:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      return new Response(JSON.stringify({ data }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error in purchase-link-handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
