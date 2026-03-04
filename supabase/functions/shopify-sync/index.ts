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
    const expectedTriggerSecret = "shopify-auto-sync-trigger-vfqqlifvhooefxvvyebm";
    if (triggerSecret && triggerSecret === expectedTriggerSecret) {
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

      const skuMap = new Map<string, { inventory_item_id: number; current_qty: number; product_id: number; tags: string }>();
      for (const p of allProducts) {
        for (const v of p.variants || []) {
          if (v.sku) {
            skuMap.set(v.sku, {
              inventory_item_id: v.inventory_item_id,
              current_qty: v.inventory_quantity || 0,
              product_id: p.id,
              tags: p.tags || "",
            });
          }
        }
      }

      const results: any[] = [];
      // Track product IDs that were successfully synced for auto-tagging
      const syncedProductIds = new Set<number>();
      const productTagsMap = new Map<number, string>();

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
            syncedProductIds.add(match.product_id);
            productTagsMap.set(match.product_id, match.tags);
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

      // Auto-tag successfully synced products with "zurwa-warehouse"
      let taggedCount = 0;
      for (const productId of syncedProductIds) {
        const existingTags = productTagsMap.get(productId) || "";
        const tagList = existingTags.split(",").map((t: string) => t.trim()).filter(Boolean);
        if (!tagList.includes("zurwa-warehouse")) {
          tagList.push("zurwa-warehouse");
          const newTags = tagList.join(", ");
          try {
            await fetch(
              `https://${config.store_domain}/admin/api/2024-01/products/${productId}.json`,
              {
                method: "PUT",
                headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
                body: JSON.stringify({ product: { id: productId, tags: newTags } }),
              }
            );
            taggedCount++;
          } catch (_) {
            // tagging is best-effort, don't fail the sync
          }
        } else {
          taggedCount++; // already tagged
        }
      }

      await supabase.from("shopify_config").update({ last_sync_at: new Date().toISOString() }).eq("user_id", userId);

      return new Response(JSON.stringify({ results, tagged: taggedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk auto-tag: tag all matched products (local inventory SKU matches Shopify) with "zurwa-warehouse"
    if (action === "auto-tag") {
      // Fetch all local SKUs
      let allSkus: string[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page } = await supabase
          .from("asin_inventory")
          .select("sku")
          .eq("user_id", userId)
          .eq("is_active", true)
          .not("sku", "is", null);
        if (!page || page.length === 0) break;
        allSkus = allSkus.concat(page.map((r: any) => r.sku).filter(Boolean));
        break; // simplified — get all at once
      }
      const localSkuSet = new Set(allSkus);

      // Fetch all Shopify products
      let allProducts: any[] = [];
      let pageInfo: string | null = null;
      let hasNext = true;
      while (hasNext) {
        let fetchUrl = `https://${config.store_domain}/admin/api/2024-01/products.json?limit=250`;
        if (pageInfo) fetchUrl += `&page_info=${pageInfo}`;
        const res = await fetch(fetchUrl, { headers: { "X-Shopify-Access-Token": accessToken } });
        if (!res.ok) break;
        const data = await res.json();
        allProducts = allProducts.concat(data.products || []);
        const linkHeader = res.headers.get("Link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
          pageInfo = match ? match[1] : null;
          hasNext = !!pageInfo;
        } else { hasNext = false; }
      }

      // Find matched products and tag them
      let taggedCount = 0;
      let alreadyTagged = 0;
      let skippedCount = 0;
      for (const p of allProducts) {
        const hasMatchedVariant = (p.variants || []).some((v: any) => v.sku && localSkuSet.has(v.sku));
        if (!hasMatchedVariant) { skippedCount++; continue; }

        const tagList = (p.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
        if (tagList.includes("zurwa-warehouse")) { alreadyTagged++; continue; }

        tagList.push("zurwa-warehouse");
        try {
          const res = await fetch(
            `https://${config.store_domain}/admin/api/2024-01/products/${p.id}.json`,
            {
              method: "PUT",
              headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
              body: JSON.stringify({ product: { id: p.id, tags: tagList.join(", ") } }),
            }
          );
          if (res.ok) taggedCount++;
        } catch (_) { /* best effort */ }
      }

      return new Response(JSON.stringify({ success: true, tagged: taggedCount, already_tagged: alreadyTagged, skipped: skippedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-product") {
      const body = await req.json();
      const { title, body_html, vendor, product_type, tags, variants, images } = body;

      if (!title) {
        return new Response(JSON.stringify({ error: "Product title is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productPayload: any = { product: { title, body_html, vendor, product_type, tags } };
      if (variants && variants.length > 0) {
        productPayload.product.variants = variants;
      }
      if (images && images.length > 0) {
        productPayload.product.images = images.map((src: string) => ({ src }));
      }

      const res = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/products.json`,
        {
          method: "POST",
          headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Failed to create product: ${res.status}`, details: errText }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const created = await res.json();
      return new Response(JSON.stringify({ success: true, product: created.product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-product") {
      const body = await req.json();
      const { product_id, title, body_html, vendor, product_type, tags, variants } = body;

      if (!product_id) {
        return new Response(JSON.stringify({ error: "product_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productPayload: any = { product: { id: product_id } };
      if (title !== undefined) productPayload.product.title = title;
      if (body_html !== undefined) productPayload.product.body_html = body_html;
      if (vendor !== undefined) productPayload.product.vendor = vendor;
      if (product_type !== undefined) productPayload.product.product_type = product_type;
      if (tags !== undefined) productPayload.product.tags = tags;
      if (variants && variants.length > 0) productPayload.product.variants = variants;

      const res = await fetch(
        `https://${config.store_domain}/admin/api/2024-01/products/${product_id}.json`,
        {
          method: "PUT",
          headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Failed to update product: ${res.status}`, details: errText }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updated = await res.json();
      return new Response(JSON.stringify({ success: true, product: updated.product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch-products-full") {
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

      return new Response(JSON.stringify({ products: allProducts }), {
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