import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { SELLER_ID, STOREFRONT, trendyolRequest } from "./connection.ts";
import { aggregateInventory, normalize } from "./domain.ts";
import { calculatedPrices } from "./pricing.ts";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("test-connection") }),
  z.object({ action: z.literal("inventory") }),
  z.object({ action: z.literal("amazon-price"), asin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/), refresh: z.boolean().default(false) }),
  z.object({ action: z.literal("pricing-submit"), items: z.array(z.object({ id: z.string().uuid(), salePrice: z.number().positive(), listPrice: z.number().positive() })).min(1).max(100) }),
  z.object({ action: z.literal("catalog"), kind: z.enum(["categories", "brands", "attributes", "values"]), categoryId: z.number().int().positive().optional(), attributeId: z.number().int().positive().optional() }),
  z.object({ action: z.literal("publish"), ids: z.array(z.string().uuid()).min(1).max(1000) }),
  z.object({ action: z.literal("sync"), ids: z.array(z.string().uuid()).min(1).max(1000), mode: z.enum(["stock", "price", "both"]) }),
  z.object({ action: z.literal("batch"), id: z.string().uuid() }),
  z.object({ action: z.literal("approval"), ids: z.array(z.string().uuid()).min(1).max(50) }),
  z.object({ action: z.literal("import-orders"), page: z.number().int().min(0).max(10000).default(0), startDate: z.number().int().positive() }),
  z.object({ action: z.literal("import-products"), page: z.number().int().min(0).max(10000).default(0) }),
  z.object({ action: z.literal("fulfill"), id: z.string().uuid() }),
  z.object({ action: z.literal("invoice"), id: z.string().uuid(), invoiceNumber: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal("tracking"), id: z.string().uuid(), trackingNumber: z.string().trim().min(1).max(100), providerCode: z.string().trim().min(1).max(100) }),
]);
const productSchema = z.object({
  barcode: z.string().min(1).max(40).regex(/^[\p{L}\p{N}._-]+$/u), title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(30000), productMainId: z.string().min(1).max(40),
  brandId: z.number().int().positive(), categoryId: z.number().int().positive(), stockCode: z.string().min(1).max(100),
  quantity: z.number().int().nonnegative(), salePrice: z.number().positive(), listPrice: z.number().positive(),
  vatRate: z.number().int().min(0).max(100), images: z.array(z.object({ url: z.string().url().startsWith("https://") })).min(1).max(8),
  attributes: z.array(z.object({ attributeId: z.number().int().positive(), attributeValueId: z.number().int().positive().optional(), attributeValueIds: z.array(z.number().int().positive()).optional(), customAttributeValue: z.string().min(1).optional() }).refine(a => a.attributeValueId || a.attributeValueIds?.length || a.customAttributeValue, "Attribute value required")),
}).refine(p => p.listPrice >= p.salePrice, "List price cannot be below sale price");
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in required" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Supabase connection is unavailable" }, 503);
    const db = createClient(url, key);
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return json({ error: "Sign in required" }, 401);
    const { data: admin, error: roleError } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (roleError || !admin) return json({ error: "Only administrators can use the Trendyol seller account" }, 403);
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
    const input = parsed.data;
    const call = async (path: string, method = "GET", body?: unknown) => {
      const result = await trendyolRequest(path, method, body);
      if (!result.ok) {
        console.error("Trendyol request failed", result.status, JSON.stringify(result.data));
        throw new ProviderError(result.status, result.data);
      }
      return result.data as any;
    };
    const inventory = async () => {
      const rows: any[] = []; const seen = new Set<string>();
      for (let start = 0; ; start += 1000) {
        const { data, error } = await db.from("asin_inventory").select("id,asin,sku,title,quantity,status,is_active,country").eq("user_id", user.id).eq("country", "KSA").or("is_active.is.null,is_active.eq.true").order("id", { ascending: true }).range(start, start + 999);
        if (error) throw error;
        for (const row of data ?? []) if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
        if ((data?.length ?? 0) < 1000) break;
      }
      return aggregateInventory(rows);
    };
    const log = async (action: string, result: any, ids: string[] = []) => {
      const { error } = await db.from("trendyol_sync_runs").insert({ user_id: user.id, action, status: result?.batchRequestId ? "pending" : "completed", batch_id: result?.batchRequestId ?? null, product_ids: ids, result });
      if (error) throw error;
    };
    if (input.action === "test-connection") {
      await call(`/integration/order/sellers/${SELLER_ID}/orders?page=0&size=1`);
      return json({ connected: true, sellerId: SELLER_ID, storefront: STOREFRONT });
    }
    if (input.action === "inventory") return json({ items: await inventory() });
    if (input.action === "amazon-price") {
      if (!input.refresh) {
        const { data: cached, error: cacheError } = await db.from("trendyol_amazon_prices").select("*").eq("user_id", user.id).eq("asin", input.asin).maybeSingle();
        if (cacheError) throw cacheError;
        if (cached) return json({ item: cached, cached: true });
      }
      const apiKey = Deno.env.get("ASIN_SPOTLIGHT_API_KEY");
      if (!apiKey) return json({ error: "ASIN Spotlight API key is not configured" }, 503);
      // Validate only matching rows, rather than downloading the whole inventory per lookup.
      const { data: local, error: inventoryError } = await db.from("asin_inventory").select("asin")
        .eq("user_id", user.id).eq("country", "KSA").or("is_active.is.null,is_active.eq.true")
        .ilike("asin", `%${input.asin}%`);
      if (inventoryError) throw inventoryError;
      if (!local?.some(i => normalize(i.asin) === input.asin)) return json({ error: "ASIN is not in active Saudi inventory" }, 400);
      const response = await fetch(`https://api.asinspotlight.com/v1/product?asin=${input.asin}&marketplace=sa`, { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(90000) });
      if (!response.ok) return json({ error: response.status === 429 ? "ASIN Spotlight rate or credit limit reached; remaining lookups stopped" : `ASIN Spotlight lookup failed (${response.status})` }, response.status >= 400 && response.status < 500 ? response.status : 502);
      let result: any;
      try { result = await response.json(); } catch { return json({ error: "ASIN Spotlight returned an unreadable response" }, 502); }
      if (result.success !== true) return json({ error: "ASIN Spotlight could not complete this lookup" }, 502);
      const raw = result.data?.bb_price;
      const price = result.found === true && typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null;
      const row = { user_id: user.id, asin: input.asin, price, currency: "SAR", status: price !== null ? "available" : result.found === false ? "not-found" : "no-price", last_error: price === null ? "No current Amazon Buy Box price" : null, fetched_at: new Date().toISOString() };
      const { data, error } = await db.from("trendyol_amazon_prices").upsert(row, { onConflict: "user_id,asin" }).select("*").single();
      if (error) throw error;
      return json({ item: data, usage: result.meta?.usage });
    }
    if (input.action === "pricing-submit") {
      const ids = input.items.map(i => i.id);
      if (new Set(ids).size !== ids.length) return json({ error: "Duplicate products selected" }, 400);
      const { data: formula, error: formulaError } = await db.from("trendyol_pricing_settings").select("percentage,fixed_sar,original_percentage,original_fixed_sar").eq("user_id", user.id).single();
      if (formulaError || !formula) return json({ error: "Save your pricing formula first" }, 400);
      const { data: products, error } = await db.from("trendyol_products").select("*").eq("user_id", user.id).eq("enabled", true).in("id", ids);
      if (error) throw error;
      if (products?.length !== ids.length) return json({ error: "Selected products are missing or disabled" }, 400);
      const { data: prices, error: priceError } = await db.from("trendyol_amazon_prices").select("asin,price,status,currency").eq("user_id", user.id).in("asin", products.map(p => normalize(p.asin)));
      if (priceError) throw priceError;
      const balances = new Set((await inventory()).map(i => normalize(i.asin)));
      const items = [];
      for (const p of products) {
        const cached = prices?.find(r => r.asin === normalize(p.asin));
        const pair = calculatedPrices(cached?.status === "available" && cached.currency === "SAR" ? Number(cached.price) : null, { percentage: Number(formula.percentage), fixed_sar: Number(formula.fixed_sar), original_percentage: Number(formula.original_percentage), original_fixed_sar: Number(formula.original_fixed_sar) });
        if (!balances.has(normalize(p.asin)) || p.publish_status !== "approved" || pair.salePrice === null || pair.listPrice === null) return json({ error: `${p.asin}: approved mapping and saved Amazon price required` }, 409);
        if (!pair.valid) return json({ error: `${p.asin}: original price must be at least sale price` }, 400);
        const preview = input.items.find(i => i.id === p.id);
        if (preview?.salePrice !== pair.salePrice || preview?.listPrice !== pair.listPrice) return json({ error: "Prices or formulas changed; refresh the preview before submitting" }, 409);
        items.push({ barcode: p.barcode, salePrice: pair.salePrice, listPrice: pair.listPrice });
      }
      const result = await call(`/integration/inventory/sellers/${SELLER_ID}/products/price-and-inventory`, "POST", { items });
      await log("sync-amazon-price", { ...result, formula, items }, ids);
      for (let i = 0; i < products.length; i++) {
        const { error } = await db.from("trendyol_products").update({ sale_price: items[i].salePrice, list_price: items[i].listPrice }).eq("id", products[i].id).eq("user_id", user.id);
        if (error) throw error;
      }
      return json(result);
    }
    if (input.action === "catalog") {
      const paths = { categories: "/integration/product/product-categories", brands: "/integration/product/brands", attributes: `/integration/product/categories/${input.categoryId}/attributes`, values: `/integration/product/categories/${input.categoryId}/attributes/${input.attributeId}/values` };
      if (["attributes", "values"].includes(input.kind) && !input.categoryId || input.kind === "values" && !input.attributeId) return json({ error: "Category and attribute IDs are required" }, 400);
      return json(await call(paths[input.kind]));
    }
    if (input.action === "approval") {
      const { data: products, error } = await db.from("trendyol_products").select("id,barcode").eq("user_id", user.id).in("id", [...new Set(input.ids)]);
      if (error) throw error;
      const results = [];
      for (const p of products ?? []) {
        const result = await call(`/integration/product/sellers/${SELLER_ID}/product/${encodeURIComponent(p.barcode)}`);
        const status = result.approved === true ? "approved" : "pending-approval";
        const { error: updateError } = await db.from("trendyol_products").update({ publish_status: status }).eq("id", p.id);
        if (updateError) throw updateError;
        results.push({ barcode: p.barcode, status, archived: result.archived });
      }
      return json({ results });
    }
    if (input.action === "publish" || input.action === "sync") {
      const ids = [...new Set(input.ids)];
      const { data: products, error } = await db.from("trendyol_products").select("*").eq("user_id", user.id).eq("enabled", true).in("id", ids);
      if (error) throw error;
      if (products?.length !== ids.length) return json({ error: "Some selected mappings are missing or disabled" }, 400);
      const balances = new Map((await inventory()).map(item => [normalize(item.asin), item.quantity]));
      const items: any[] = [];
      for (const p of products) {
        const quantity = balances.get(normalize(p.asin));
        if (quantity === undefined) return json({ error: `No active Saudi inventory for ${p.asin}` }, 400);
        if (input.action === "publish") {
          const validated = productSchema.safeParse({ barcode: p.barcode, title: p.title, description: p.description, productMainId: p.product_main_id, brandId: p.brand_id, categoryId: p.category_id, stockCode: p.sku, quantity, salePrice: Number(p.sale_price), listPrice: Number(p.list_price), vatRate: p.vat_rate, images: p.images, attributes: p.attributes });
          if (!validated.success) return json({ error: `Incomplete product: ${p.sku}`, details: validated.error.flatten() }, 400);
          const meta = await call(`/integration/product/categories/${p.category_id}/attributes`);
          const required = (meta.categoryAttributes ?? []).filter((a: any) => a.required);
          for (const a of required) if (!validated.data.attributes.some(v => v.attributeId === (a.attribute?.id ?? a.id))) return json({ error: `${p.sku}: missing required attribute ${a.attribute?.name ?? a.id}` }, 400);
          items.push(validated.data);
        } else {
          if (p.publish_status !== "approved") return json({ error: `Check approval for ${p.sku} before syncing` }, 400);
          const item: any = { barcode: p.barcode };
          if (input.mode !== "price") item.quantity = quantity;
          if (input.mode !== "stock") {
            if (Number(p.sale_price) <= 0 || Number(p.list_price) < Number(p.sale_price)) return json({ error: `Invalid prices for ${p.sku}` }, 400);
            item.salePrice = Number(p.sale_price); item.listPrice = Number(p.list_price);
          }
          items.push(item);
        }
      }
      const path = input.action === "publish" ? `/integration/product/sellers/${SELLER_ID}/v2/products` : `/integration/inventory/sellers/${SELLER_ID}/products/price-and-inventory`;
      const result = await call(path, "POST", { items });
      await log(input.action === "publish" ? "publish" : `sync-${input.mode}`, result, ids);
      if (input.action === "publish") {
        const { error: updateError } = await db.from("trendyol_products").update({ publish_status: "submitted", last_batch_id: result.batchRequestId, last_error: null }).in("id", ids).eq("user_id", user.id);
        if (updateError) throw updateError;
      }
      return json(result);
    }
    if (input.action === "batch") {
      const { data: run, error } = await db.from("trendyol_sync_runs").select("*").eq("id", input.id).eq("user_id", user.id).single();
      if (error || !run?.batch_id) return json({ error: "Batch not found" }, 404);
      const result = await call(`/integration/product/sellers/${SELLER_ID}/products/batch-requests/${encodeURIComponent(run.batch_id)}`);
      const failed = (result.items ?? []).some((i: any) => i.status === "FAILED" || i.failureReasons?.length);
      const status = result.status === "COMPLETED" ? failed ? "failed" : "completed" : "pending";
      const { error: updateError } = await db.from("trendyol_sync_runs").update({ status, result }).eq("id", run.id);
      if (updateError) throw updateError;
      if (run.action === "publish" && status !== "pending") {
        for (const id of run.product_ids) {
          const { data: p } = await db.from("trendyol_products").select("barcode").eq("id", id).single();
          const item = (result.items ?? []).find((i: any) => (i.requestItem?.barcode ?? i.barcode) === p?.barcode);
          const itemFailed = item?.status === "FAILED" || item?.failureReasons?.length;
          await db.from("trendyol_products").update({ publish_status: item ? itemFailed ? "failed" : "pending-approval" : "submitted", last_error: itemFailed ? JSON.stringify(item.failureReasons) : null }).eq("id", id).eq("last_batch_id", run.batch_id);
        }
      }
      return json(result);
    }
    if (input.action === "import-products") {
      const result = await call(`/integration/product/sellers/${SELLER_ID}/products?page=${input.page}&size=500`);
      const remote = (result.content ?? []) as any[];
      const { data: existing, error: existingError } = await db.from("trendyol_products").select("id,asin,sku,barcode").eq("user_id", user.id);
      if (existingError) throw existingError;
      const byBarcode = new Map((existing ?? []).map(r => [r.barcode, r]));
      const asinTaken = new Map((existing ?? []).map(r => [normalize(r.asin), r.barcode]));
      const skuTaken = new Map((existing ?? []).map(r => [normalize(r.sku), r.barcode]));
      let inserted = 0, updated = 0, skipped = 0;
      const reasons: string[] = [];
      const fail = (barcode: string, reason: string) => { skipped++; if (reasons.length < 5) reasons.push(`${barcode}: ${reason}`); };
      for (const p of remote) {
        const barcode = String(p.barcode ?? "").trim();
        if (!barcode) { fail("(no barcode)", "missing barcode"); continue; }
        const stockCode = String(p.stockCode ?? "").trim();
        const key = normalize(stockCode || barcode);
        const match = byBarcode.get(barcode);
        const status = p.archived ? "archived" : p.approved ? "approved" : "pending-approval";
        const fields = {
          title: String(p.title ?? "").slice(0, 100) || barcode,
          description: String(p.description ?? "").slice(0, 30000) || String(p.title ?? barcode),
          product_main_id: String(p.productMainId ?? barcode).slice(0, 40),
          brand_id: p.brandId ?? null, category_id: p.categoryId ?? null,
          sale_price: Number(p.salePrice ?? 0), list_price: Number(p.listPrice ?? p.salePrice ?? 0),
          vat_rate: Number(p.vatRate ?? 15), images: Array.isArray(p.images) ? p.images.slice(0, 8) : [],
          attributes: Array.isArray(p.attributes) ? p.attributes : [],
          publish_status: status, last_error: null,
        };
        if (match) {
          const { error } = await db.from("trendyol_products").update(fields).eq("id", match.id);
          if (error) { fail(barcode, error.message); continue; }
          updated++;
        } else {
          // Avoid collisions: asin/sku are unique per user, so only insert when free.
          if (asinTaken.has(key) || skuTaken.has(key)) { fail(barcode, `ASIN/SKU ${key} already mapped to another barcode`); continue; }
          const { error } = await db.from("trendyol_products").insert({ ...fields, user_id: user.id, barcode, asin: key, sku: key, enabled: true });
          if (error) { fail(barcode, error.message); continue; }
          asinTaken.set(key, barcode); skuTaken.set(key, barcode);
          inserted++;
        }
      }
      await log("import-products", { count: remote.length, inserted, updated, skipped, reasons, page: input.page });
      return json({ count: remote.length, inserted, updated, skipped, reasons, totalPages: result.totalPages ?? 1, page: input.page });
    }
    if (input.action === "import-orders") {
      if (input.startDate < Date.now() - 90 * 86400000 || input.startDate > Date.now()) return json({ error: "Use an order date within the last 90 days" }, 400);
      const result = await call(`/integration/order/sellers/${SELLER_ID}/orders?page=${input.page}&size=200&startDate=${input.startDate}&endDate=${Date.now()}&orderByField=PackageLastModifiedDate&orderByDirection=ASC`);
      const packages = [...new Map((result.content ?? []).map((p: any) => [String(p.id), p])).values()] as any[];
      if (packages.length) {
        const { error } = await db.from("trendyol_packages").upsert(packages.map(p => ({ user_id: user.id, package_id: String(p.id), order_number: String(p.orderNumber), remote_status: p.status, lines: p.lines ?? [], payload: p })), { onConflict: "user_id,package_id" });
        if (error) throw error;
      }
      await log("import-orders", { count: packages.length, page: input.page });
      return json({ count: packages.length, totalPages: result.totalPages, page: input.page });
    }
    const { data: pkg, error: packageError } = await db.from("trendyol_packages").select("*").eq("id", input.id).eq("user_id", user.id).single();
    if (packageError || !pkg) return json({ error: "Package not found" }, 404);
    // Refresh remote status before touching stock; never fulfill a canceled stale import.
    const fresh = await call(`/integration/order/sellers/${SELLER_ID}/orders?shipmentPackageIds=${encodeURIComponent(pkg.package_id)}&size=200`);
    const remote = (fresh.content ?? []).find((p: any) => String(p.id) === pkg.package_id);
    if (!remote) return json({ error: "Package no longer exists on Trendyol; import orders again" }, 409);
    if (["Cancelled", "Returned", "UnSupplied", "UnDelivered"].includes(remote.status)) return json({ error: `Package is ${remote.status}; no stock deducted` }, 409);
    const { error: refreshError } = await db.from("trendyol_packages").update({ remote_status: remote.status, lines: remote.lines ?? [], payload: remote }).eq("id", pkg.id);
    if (refreshError) throw refreshError;
    const lines = (remote.lines ?? []).map((l: any) => ({ lineId: l.id, quantity: l.quantity }));
    if (input.action === "fulfill") {
      const { data: plan, error: rpcError } = await db.rpc("fulfill_trendyol_package", { p_user_id: user.id, p_package_id: pkg.id });
      if (rpcError) return json({ error: rpcError.message }, 409);
      let warning: string | null = null;
      if (remote.status === "Created") {
        try {
          await call(`/integration/order/sellers/${SELLER_ID}/shipment-packages/${pkg.package_id}`, "PUT", { lines, params: {}, status: "Picking" });
          await db.from("trendyol_packages").update({ remote_status: "Picking", last_error: null }).eq("id", pkg.id);
        } catch (error) {
          warning = error instanceof ProviderError ? `Picking notification failed [${error.status}]: ${JSON.stringify(error.details)}` : "Picking notification failed";
          await db.from("trendyol_packages").update({ last_error: warning }).eq("id", pkg.id);
        }
      }
      await log("fulfill", { package: pkg.order_number, ...plan, warning });
      return json({ ...plan, warning });
    }
    if (!pkg.fulfilled_at) return json({ error: "Fulfill local stock first" }, 409);
    if (input.action === "invoice") {
      if (remote.status !== "Picking") return json({ error: "Package must be Picking before invoicing" }, 409);
      const result = await call(`/integration/order/sellers/${SELLER_ID}/shipment-packages/${pkg.package_id}`, "PUT", { lines, params: { invoiceNumber: input.invoiceNumber }, status: "Invoiced" });
      await db.from("trendyol_packages").update({ remote_status: "Invoiced", last_error: null }).eq("id", pkg.id);
      await log("invoice", { package: pkg.order_number, result }); return json({ success: true });
    }
    if (input.action === "tracking") {
      if (!["Picking", "Invoiced"].includes(remote.status)) return json({ error: "Picking or Invoiced status required" }, 409);
      const result = await call(`/integration/order/sellers/${SELLER_ID}/shipment-packages/${pkg.package_id}/tracking-details`, "PUT", { cargoSenderNumber: input.trackingNumber, providerCode: input.providerCode });
      await log("tracking", { package: pkg.order_number, result }); return json({ success: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    if (error instanceof ProviderError) return json({ error: "Trendyol request failed", status: error.status, details: error.details }, error.status);
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON" }, 400);
    return json({ error: error instanceof Error ? error.message : "Connection failed" }, 500);
  }
});

class ProviderError extends Error {
  constructor(public status: number, public details: unknown) { super("Trendyol request failed"); }
}