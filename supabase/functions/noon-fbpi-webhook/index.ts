import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("key") || req.headers.get("x-api-key");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key. Provide ?key= or x-api-key header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to validate the API key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: keyRecord, error: keyError } = await supabase
      .from("noon_webhook_keys")
      .select("id, user_id, store_id, is_active")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single();

    if (keyError || !keyRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = keyRecord.user_id;
    const storeId = keyRecord.store_id;

    const body = await req.json();

    // Support Noon's native format or generic format
    const fbpiOrderNr = body.fbpi_order_nr || body.order_nr || body.orderNr;
    const mpOrderNr = body.mp_order_nr || body.mpOrderNr || null;
    const mpCode = body.mp_code || body.mpCode || null;
    const mpCountryCode = body.mp_country_code || body.mpCountryCode || null;
    const warehouseCode = body.warehouse_code || body.warehouseCode || null;
    const currencyCode = body.currency_code || body.currencyCode || null;
    const orderCreatedAt = body.order_created_at || body.createdAt || null;
    const items = body.items || [];

    if (!fbpiOrderNr) {
      return new Response(
        JSON.stringify({ error: "Missing fbpi_order_nr in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Match inventory for each item
    const inventoryStatus: Record<string, any> = {};
    for (const item of items) {
      const sku = item.partner_sku || item.partnerSku || item.sku;
      if (!sku) continue;

      const orderQty = item.quantity || item.qty || 1;

      const { data: invItems } = await supabase
        .from("asin_inventory")
        .select("id, sku, quantity")
        .eq("sku", sku)
        .eq("user_id", userId)
        .eq("is_active", true);

      const totalQty = (invItems || []).reduce(
        (sum: number, i: any) => sum + (i.quantity || 0),
        0
      );

      let status = "out_of_stock";
      if (totalQty >= orderQty) status = "in_stock";
      else if (totalQty > 0) status = "low_stock";

      inventoryStatus[sku] = {
        available_quantity: totalQty,
        required_quantity: orderQty,
        status,
      };
    }

    // Upsert the order
    const { data: order, error: upsertError } = await supabase
      .from("noon_fbpi_orders")
      .upsert(
        {
          user_id: userId,
          store_id: storeId,
          fbpi_order_nr: fbpiOrderNr,
          mp_order_nr: mpOrderNr,
          mp_code: mpCode,
          mp_country_code: mpCountryCode,
          warehouse_code: warehouseCode,
          currency_code: currencyCode,
          items,
          inventory_status: inventoryStatus,
          status: "received",
          order_created_at: orderCreatedAt,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "fbpi_order_nr" }
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to store order", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order?.id,
        fbpi_order_nr: fbpiOrderNr,
        inventory_status: inventoryStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
