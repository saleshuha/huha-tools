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

async function getAccessToken(storeDomain: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
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

    const token = authHeader.replace("Bearer ", "");
    let userId: string;

    // Check if this is a trigger call via x-trigger-secret header
    const triggerSecret = req.headers.get("x-trigger-secret");
    if (triggerSecret && triggerSecret === supabaseKey) {
      // Trigger call — user_id will be in the body
      const url = new URL(req.url);
      const action = url.searchParams.get("action") || "sync";
      if (action === "sync") {
        const body = await req.clone().json();
        userId = body.user_id;
        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing user_id in trigger payload" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "Trigger can only call sync action" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (token === supabaseKey) {
      // Service role call from database trigger — user_id will be in the body
      const url = new URL(req.url);
      const action = url.searchParams.get("action") || "sync";
      if (action === "sync") {
        const body = await req.clone().json();
        userId = body.user_id;
        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing user_id in trigger payload" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "Service role can only call sync action" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Normal user auth
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data, error: claimsError } = await anonClient.auth.getUser(token);
      if (claimsError || !data?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = data.user.id;
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "sync";

    const { data: config, error: configError } = await supabase
      .from("shopify_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ error: "No Shopify config found. Please save your settings first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine how to authenticate: new OAuth flow (client_id + client_secret) or legacy api_token
    let accessToken: string;
    if (config.client_id && config.client_secret) {
      try {
        accessToken = await getAccessToken(config.store_domain, config.client_id, config.client_secret);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `Failed to obtain Shopify access token: ${e.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (config.api_token) {
      // Legacy: direct api_token
      accessToken = config.api_token;
    } else {
      return new Response(
        JSON.stringify({ error: "No credentials configured. Add your Client ID and Client Secret in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test-connection") {
      const shopRes = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/shop.json`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      );

      if (!shopRes.ok) {
        const errText = await shopRes.text();
        const friendlyError = shopRes.status === 401
          ? "Authentication failed. Check that your Client ID and Client Secret are correct and the app is installed."
          : `Shopify API error: ${shopRes.status}`;

        return new Response(
          JSON.stringify({ error: friendlyError, details: errText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shopData = await shopRes.json();

      const locRes = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/locations.json`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
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
      let allProducts: any[] = [];
      let pageInfo: string | null = null;
      let hasNext = true;

      while (hasNext) {
        let fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250&fields=id,title,variants`;
        if (pageInfo) {
          fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250&page_info=${pageInfo}`;
        }

        const res = await fetch(fetchUrl, {
          headers: { "X-Shopify-Access-Token": accessToken },
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

        const linkHeader = res.headers.get("Link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
          pageInfo = match ? match[1] : null;
          hasNext = !!pageInfo;
        } else {
          hasNext = false;
        }
      }

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

      let allProducts: any[] = [];
      let pageInfo: string | null = null;
      let hasNext = true;

      while (hasNext) {
        let fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250`;
        if (pageInfo) {
          fetchUrl += `&page_info=${pageInfo}`;
        }

        const res = await fetch(fetchUrl, {
          headers: { "X-Shopify-Access-Token": accessToken },
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
          results.push({ sku: item.sku, status: "skipped", error_message: "SKU not found in Shopify" });
          await supabase.from("shopify_sync_log").insert({
            user_id: userId, sku: item.sku, title: item.title,
            local_quantity: item.local_quantity, shopify_quantity: null,
            new_quantity: item.local_quantity, status: "skipped",
            error_message: "SKU not found in Shopify",
          });
          continue;
        }

        try {
          const setRes = await fetch(
            `https://${config.store_domain}/admin/api/2024-01/inventory_levels/set.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": accessToken,
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
            results.push({ sku: item.sku, status: "failed", error_message: errText });
            await supabase.from("shopify_sync_log").insert({
              user_id: userId, sku: item.sku, title: item.title,
              local_quantity: item.local_quantity, shopify_quantity: match.current_qty,
              new_quantity: item.local_quantity, status: "failed", error_message: errText,
            });
          } else {
            await setRes.json();
            results.push({ sku: item.sku, status: "success" });
            await supabase.from("shopify_sync_log").insert({
              user_id: userId, sku: item.sku, title: item.title,
              local_quantity: item.local_quantity, shopify_quantity: match.current_qty,
              new_quantity: item.local_quantity, status: "success",
            });
          }
        } catch (e) {
          results.push({ sku: item.sku, status: "failed", error_message: e.message });
          await supabase.from("shopify_sync_log").insert({
            user_id: userId, sku: item.sku, title: item.title,
            local_quantity: item.local_quantity, shopify_quantity: match.current_qty,
            new_quantity: item.local_quantity, status: "failed", error_message: e.message,
          });
        }
      }

      await supabase.from("shopify_config").update({ last_sync_at: new Date().toISOString() }).eq("user_id", userId);

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