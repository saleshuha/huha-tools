import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SyncItem {
  sku: string;
  title?: string;
  local_quantity: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "sync";

    // Get shopify config
    const { data: config, error: configError } = await supabase
      .from("shopify_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (action === "test-connection") {
      if (!config) {
        return new Response(JSON.stringify({ error: "No Shopify config found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Test connection by fetching shop info
      const shopRes = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/shop.json`,
        { headers: { "X-Shopify-Access-Token": config.api_token } }
      );

      if (!shopRes.ok) {
        const errText = await shopRes.text();
        return new Response(
          JSON.stringify({ error: `Shopify API error: ${shopRes.status}`, details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shopData = await shopRes.json();
      
      // Also fetch locations
      const locRes = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/locations.json`,
        { headers: { "X-Shopify-Access-Token": config.api_token } }
      );
      let locations: any[] = [];
      if (locRes.ok) {
        const locData = await locRes.json();
        locations = locData.locations || [];
      }

      return new Response(
        JSON.stringify({ success: true, shop: shopData.shop, locations }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fetch-products") {
      if (!config) {
        return new Response(JSON.stringify({ error: "No Shopify config found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch all products with inventory info
      let allProducts: any[] = [];
      let pageInfo: string | null = null;
      let hasNext = true;

      while (hasNext) {
        let fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250&fields=id,title,variants`;
        if (pageInfo) {
          fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250&page_info=${pageInfo}`;
        }

        const res = await fetch(fetchUrl, {
          headers: { "X-Shopify-Access-Token": config.api_token },
        });

        if (!res.ok) {
          const errText = await res.text();
          return new Response(
            JSON.stringify({ error: `Failed to fetch products: ${res.status}`, details: errText }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await res.json();
        allProducts = allProducts.concat(data.products || []);

        // Check for pagination
        const linkHeader = res.headers.get("Link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
          pageInfo = match ? match[1] : null;
          hasNext = !!pageInfo;
        } else {
          hasNext = false;
        }
      }

      // Flatten variants with SKU
      const variants = allProducts.flatMap((p: any) =>
        (p.variants || []).map((v: any) => ({
          product_id: p.id,
          product_title: p.title,
          variant_id: v.id,
          variant_title: v.title,
          sku: v.sku,
          inventory_item_id: v.inventory_item_id,
          inventory_quantity: v.inventory_quantity,
        }))
      );

      return new Response(JSON.stringify({ products: variants }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      if (!config) {
        return new Response(JSON.stringify({ error: "No Shopify config found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const items: SyncItem[] = body.items || [];

      if (items.length === 0) {
        return new Response(JSON.stringify({ error: "No items to sync" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const locationId = config.location_id;
      if (!locationId) {
        return new Response(
          JSON.stringify({ error: "No location_id configured. Please set up your Shopify location first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch all products to match SKUs
      let allProducts: any[] = [];
      let pageInfo: string | null = null;
      let hasNext = true;

      while (hasNext) {
        let fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250`;
        if (pageInfo) {
          fetchUrl += `&page_info=${pageInfo}`;
        }

        const res = await fetch(fetchUrl, {
          headers: { "X-Shopify-Access-Token": config.api_token },
        });

        if (!res.ok) break;
        const data = await res.json();
        allProducts = allProducts.concat(data.products || []);

        const linkHeader = res.headers.get("Link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
          pageInfo = match ? match[1] : null;
          hasNext = !!pageInfo;
        } else {
          hasNext = false;
        }
      }

      // Build SKU -> inventory_item_id map
      const skuMap = new Map<string, { inventory_item_id: number; current_qty: number }>();
      for (const p of allProducts) {
        for (const v of p.variants || []) {
          if (v.sku) {
            skuMap.set(v.sku, {
              inventory_item_id: v.inventory_item_id,
              current_qty: v.inventory_quantity || 0,
            });
          }
        }
      }

      const results: any[] = [];

      for (const item of items) {
        const match = skuMap.get(item.sku);
        if (!match) {
          results.push({
            sku: item.sku,
            status: "skipped",
            error_message: "SKU not found in Shopify",
          });

          await supabase.from("shopify_sync_log").insert({
            user_id: user.id,
            sku: item.sku,
            title: item.title,
            local_quantity: item.local_quantity,
            shopify_quantity: null,
            new_quantity: item.local_quantity,
            status: "skipped",
            error_message: "SKU not found in Shopify",
          });
          continue;
        }

        try {
          // Set inventory level
          const setRes = await fetch(
            `https://${config.store_domain}/admin/api/2024-01/inventory_levels/set.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": config.api_token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                location_id: parseInt(locationId),
                inventory_item_id: match.inventory_item_id,
                available: item.local_quantity,
              }),
            }
          );

          if (!setRes.ok) {
            const errText = await setRes.text();
            results.push({
              sku: item.sku,
              status: "failed",
              error_message: errText,
            });

            await supabase.from("shopify_sync_log").insert({
              user_id: user.id,
              sku: item.sku,
              title: item.title,
              local_quantity: item.local_quantity,
              shopify_quantity: match.current_qty,
              new_quantity: item.local_quantity,
              status: "failed",
              error_message: errText,
            });
          } else {
            await setRes.json(); // consume body
            results.push({ sku: item.sku, status: "success" });

            await supabase.from("shopify_sync_log").insert({
              user_id: user.id,
              sku: item.sku,
              title: item.title,
              local_quantity: item.local_quantity,
              shopify_quantity: match.current_qty,
              new_quantity: item.local_quantity,
              status: "success",
            });
          }
        } catch (e) {
          results.push({
            sku: item.sku,
            status: "failed",
            error_message: e.message,
          });

          await supabase.from("shopify_sync_log").insert({
            user_id: user.id,
            sku: item.sku,
            title: item.title,
            local_quantity: item.local_quantity,
            shopify_quantity: match.current_qty,
            new_quantity: item.local_quantity,
            status: "failed",
            error_message: e.message,
          });
        }
      }

      // Update last sync timestamp
      await supabase
        .from("shopify_config")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
