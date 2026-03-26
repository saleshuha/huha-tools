import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const externalSyncKey = Deno.env.get("EXTERNAL_APP_SYNC_KEY");

    if (!externalSyncKey) {
      return new Response(
        JSON.stringify({ error: "EXTERNAL_APP_SYNC_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { action, webhookUrl, products, asin, country } = body;

    const targetUrl =
      webhookUrl || "https://crcrrejwzouyysadrrpv.supabase.co/functions/v1/product-sync";

    // Helper: forward to external webhook
    const forwardToWebhook = async (payload: Record<string, unknown>) => {
      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${externalSyncKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      let responseData;
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { raw: text };
      }
      return { status: resp.status, ok: resp.ok, data: responseData };
    };

    // Helper: log sync operation
    const logOperation = async (
      logAction: string,
      status: string,
      itemsCount: number,
      errorMsg?: string,
      payload?: unknown,
      response?: unknown
    ) => {
      await supabase.from("external_sync_log").insert({
        user_id: userId,
        action: logAction,
        status,
        items_count: itemsCount,
        error_message: errorMsg || null,
        payload: payload as any,
        response: response as any,
      });
    };

    // ──── TEST CONNECTION ────
    if (action === "test-connection") {
      const result = await forwardToWebhook({ action: "ping" });
      await logOperation("test-connection", result.ok ? "success" : "failed", 0, result.ok ? undefined : JSON.stringify(result.data));
      return new Response(JSON.stringify({ success: result.ok, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──── SYNC INVENTORY (bulk push) ────
    if (action === "sync-inventory") {
      const selectedCountry = country || "KSA";
      // Fetch all active inventory for this user + country
      let allItems: any[] = [];
      let from = 0;
      const chunkSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("asin_inventory")
          .select("asin, sku, title, quantity, status, serial_number")
          .eq("user_id", userId)
          .eq("country", selectedCountry)
          .or("is_active.is.null,is_active.eq.true")
          .range(from, from + chunkSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allItems = allItems.concat(data);
        if (data.length < chunkSize) break;
        from += chunkSize;
      }

      // Aggregate by ASIN (sum quantities)
      const asinMap = new Map<string, { asin: string; sku: string; title: string; quantity: number; status: string }>();
      for (const item of allItems) {
        const existing = asinMap.get(item.asin);
        if (existing) {
          existing.quantity += item.quantity || 0;
        } else {
          asinMap.set(item.asin, {
            asin: item.asin,
            sku: item.sku || "",
            title: item.title || "",
            quantity: item.quantity || 0,
            status: item.status || "in-stock",
          });
        }
      }

      const productsPayload = Array.from(asinMap.values());

      // Send in batches of 50
      const batchSize = 50;
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < productsPayload.length; i += batchSize) {
        const batch = productsPayload.slice(i, i + batchSize);
        const result = await forwardToWebhook({
          action: "sync_inventory",
          products: batch,
        });
        if (result.ok) {
          successCount += batch.length;
        } else {
          failCount += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${JSON.stringify(result.data)}`);
        }
      }

      const finalStatus = failCount === 0 ? "success" : successCount > 0 ? "partial" : "failed";
      await logOperation(
        "sync-inventory",
        finalStatus,
        productsPayload.length,
        errors.length > 0 ? errors.join("; ") : undefined,
        { totalItems: productsPayload.length, country: selectedCountry },
        { successCount, failCount }
      );

      // Update last_synced_at
      if (successCount > 0) {
        await supabase
          .from("external_sync_config")
          .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }

      return new Response(
        JSON.stringify({ success: finalStatus !== "failed", status: finalStatus, successCount, failCount, totalItems: productsPayload.length, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──── CREATE / UPDATE PRODUCT ────
    if (action === "create-product" || action === "update-product") {
      if (!products || !Array.isArray(products) || products.length === 0) {
        return new Response(JSON.stringify({ error: "products array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await forwardToWebhook({
        action: action === "create-product" ? "create_product" : "update_product",
        products,
      });
      await logOperation(action, result.ok ? "success" : "failed", products.length, result.ok ? undefined : JSON.stringify(result.data), { products }, result.data);
      return new Response(JSON.stringify({ success: result.ok, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──── DELETE PRODUCT ────
    if (action === "delete-product") {
      if (!asin) {
        return new Response(JSON.stringify({ error: "asin required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await forwardToWebhook({ action: "delete_product", asin });
      await logOperation("delete-product", result.ok ? "success" : "failed", 1, result.ok ? undefined : JSON.stringify(result.data), { asin }, result.data);
      return new Response(JSON.stringify({ success: result.ok, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("External app sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
