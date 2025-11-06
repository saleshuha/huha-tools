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
      const { poNumbers, title, description, expiresInDays, userId } = await req.json();
      
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
      
      const { data, error } = await supabaseClient
        .from('purchase_links')
        .insert({
          link_token: token,
          user_id: userId,
          po_numbers: poNumbers,
          title,
          description,
          expires_at: expiresAt
        })
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
      
      // Fetch PO orders
      const { data: poOrders, error: ordersError } = await supabaseClient
        .from('po_orders')
        .select('*')
        .in('po_number', link.po_numbers)
        .eq('user_id', link.user_id);
      
      if (ordersError) {
        console.error('Error fetching PO orders:', ordersError);
      }

      // Fetch product images for the ASINs in the orders
      let productImages: any[] = [];
      if (poOrders && poOrders.length > 0) {
        const asins = poOrders
          .map(order => order.asin)
          .filter(asin => asin); // Filter out null/undefined ASINs
        
        if (asins.length > 0) {
          const { data: images } = await supabaseClient
            .from('product_images')
            .select('asin, image_url')
            .in('asin', asins);
          
          productImages = images || [];
        }
      }

      // Attach product images to orders
      const ordersWithImages = poOrders?.map(order => ({
        ...order,
        product_image: productImages.find(img => img.asin === order.asin) || null
      })) || [];
      
      // Fetch existing purchase updates
      const { data: updates, error: updatesError } = await supabaseClient
        .from('purchase_updates')
        .select('*')
        .eq('link_id', link.id);
      
      if (updatesError) {
        console.error('Error fetching updates:', updatesError);
      }
      
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
      
      // Upsert purchase update
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
          estimated_delivery: updateData.estimatedDelivery,
          unit_cost: updateData.unitCost,
          total_cost: updateData.totalCost,
          updated_by_name: updateData.updatedByName,
          updated_by_email: updateData.updatedByEmail,
          notes: updateData.notes,
          metadata: updateData.metadata || {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'link_id,po_order_id'
        })
        .select()
        .single();
      
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
