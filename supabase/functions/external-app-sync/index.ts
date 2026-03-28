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

    // Validate user via getUser
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const { action, webhookUrl, product, sku, country } = body;

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
      const result = await forwardToWebhook({ action: "bulk_upsert", products: [] });
      const success = result.ok || result.status === 200;
      await logOperation("test-connection", success ? "success" : "failed", 0, success ? undefined : JSON.stringify(result.data));
      return new Response(JSON.stringify({ success, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──── UPSERT PRODUCT (single product push) ────
    if (action === "upsert-product") {
      if (!product || typeof product !== "object") {
        return new Response(JSON.stringify({ error: "product object required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payload = {
        action: "upsert_product",
        product: {
          name: product.name || product.title || product.asin,
          slug: product.slug || (product.asin ? product.asin.toLowerCase() : undefined),
          sku: product.sku || product.asin,
          description: product.description || undefined,
          // omit status — let destination use its default enum value
          retail_price: product.retail_price || undefined,
          cost_price: product.cost_price || undefined,
          inventory: product.inventory || (product.quantity !== undefined ? { quantity: product.quantity } : undefined),
          images: product.images || undefined,
        },
      };
      const result = await forwardToWebhook(payload);
      await logOperation("upsert-product", result.ok ? "success" : "failed", 1, result.ok ? undefined : JSON.stringify(result.data), payload, result.data);
      return new Response(JSON.stringify({ success: result.ok, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──── UPDATE INVENTORY ────
    if (action === "update-inventory") {
      const targetSku = sku || body.asin;
      if (!targetSku) {
        return new Response(JSON.stringify({ error: "sku required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await forwardToWebhook({
        action: "update_inventory",
        sku: targetSku,
        quantity: body.quantity ?? 0,
        variant_sku: body.variant_sku || undefined,
      });
      await logOperation("update-inventory", result.ok ? "success" : "failed", 1, result.ok ? undefined : JSON.stringify(result.data), { sku: targetSku, quantity: body.quantity }, result.data);
      return new Response(JSON.stringify({ success: result.ok, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──── DELETE PRODUCT ────
    if (action === "delete-product") {
      const targetSku = sku || body.asin;
      if (!targetSku) {
        return new Response(JSON.stringify({ error: "sku required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await forwardToWebhook({ action: "delete_product", sku: targetSku });
      await logOperation("delete-product", result.ok ? "success" : "failed", 1, result.ok ? undefined : JSON.stringify(result.data), { sku: targetSku }, result.data);
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
