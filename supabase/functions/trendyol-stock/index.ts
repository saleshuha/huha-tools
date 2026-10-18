import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { SELLER_ID, trendyolRequest } from "../trendyol/connection.ts";
import { stockItems, stockBatchOutcome } from "../trendyol/stock.ts";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Capabilityless wake-up: callers cannot choose a user, product, stock or provider action.
// All work comes exclusively from the protected outbox, with a global database lease.
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) return json({ error: "Only an empty wake request is allowed" }, 400);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Stock service unavailable" }, 503);
  const db = createClient(url, key);
  const lease = crypto.randomUUID();
  const { data: claimed, error: claimError } = await db.rpc("claim_trendyol_stock_worker", { p_token: lease });
  if (claimError) return json({ error: "Stock processor unavailable" }, 503);
  if (!claimed) return json({ busy: true });
  const deadline = Date.now() + 80000;
  const check = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
  let submitted = 0;
  try {
    // Reconcile old batches before sending a newer version of the same product.
    const { data: active, error: activeError } = await db.from("trendyol_stock_queue").select("*").eq("state", "submitted").lte("next_attempt_at", new Date().toISOString()).order("id", { ascending: true }).limit(1000);
    check(activeError);
    for (const batchId of new Set((active ?? []).map(r => r.batch_id).filter(Boolean))) {
      if (Date.now() > deadline) break;
      const response = await trendyolRequest(`/integration/product/sellers/${SELLER_ID}/products/batch-requests/${encodeURIComponent(batchId)}`);
      if (!response.ok) {
        check((await db.from("trendyol_stock_queue").update({ next_attempt_at: new Date(Date.now() + 60000).toISOString(), last_error: `Batch check failed (${response.status})` }).eq("batch_id", batchId)).error);
        continue;
      }
      const result = response.data as any;
      const outcome = stockBatchOutcome(result);
      if (outcome === "submitted") {
        check((await db.from("trendyol_stock_queue").update({ next_attempt_at: new Date(Date.now() + 60000).toISOString() }).eq("batch_id", batchId)).error);
        continue;
      }
      check((await db.from("trendyol_sync_runs").update({ status: outcome, result }).eq("batch_id", batchId)).error);
      // Re-read all rows in the batch: a quantity change can increment the version during polling.
      const { data: batchRows, error } = await db.from("trendyol_stock_queue").select("*").eq("batch_id", batchId).order("id", { ascending: true }).limit(1000);
      check(error);
      for (const row of batchRows ?? []) {
        const newer = row.version !== row.sent_version;
        check((await db.from("trendyol_stock_queue").update({ state: newer ? "pending" : outcome, batch_id: null, next_attempt_at: new Date().toISOString(), last_error: outcome === "failed" ? JSON.stringify(result).slice(0, 6000) : null })
          .eq("id", row.id).eq("version", row.version).eq("batch_id", batchId)).error);
      }
    }
    while (Date.now() < deadline) {
      const { data: pending, error } = await db.from("trendyol_stock_queue").select("*").eq("state", "pending").lte("next_attempt_at", new Date().toISOString()).order("id", { ascending: true }).limit(1000);
      check(error);
      if (!pending?.length) break;
      const userId = pending[0].user_id;
      const rows = pending.filter(r => r.user_id === userId);
      const { data: admin, error: roleError } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
      check(roleError);
      if (!admin) {
        check((await db.from("trendyol_stock_queue").update({ state: "failed", last_error: "Administrator access removed" }).in("id", rows.map(r => r.id))).error);
        continue;
      }
      const { data: products, error: productError } = await db.from("trendyol_products").select("id,asin,barcode,stock_sync_mapped").eq("user_id", userId).in("id", rows.map(r => r.product_id));
      check(productError);
      const inventory: any[] = []; const seen = new Set<string>();
      for (let start = 0; ; start += 1000) {
        const { data, error } = await db.from("asin_inventory").select("id,asin,quantity,status,country,is_active").eq("user_id", userId).eq("country", "KSA").or("is_active.is.null,is_active.eq.true").order("id", { ascending: true }).range(start, start + 999);
        check(error);
        for (const r of data ?? []) if (!seen.has(r.id)) { seen.add(r.id); inventory.push(r); }
        if ((data?.length ?? 0) < 1000) break;
      }
      const items = stockItems(products ?? [], inventory);
      const ids = rows.map(r => r.id);
      if (!items.length) {
        check((await db.from("trendyol_stock_queue").update({ state: "failed", last_error: "Inventory mapping required" }).in("id", ids)).error);
        continue;
      }
      const response = await trendyolRequest(`/integration/inventory/sellers/${SELLER_ID}/products/price-and-inventory`, "POST", { items });
      const result = response.data as any;
      if (!response.ok || !result?.batchRequestId) {
        for (const row of rows) {
          const retry = response.status === 429 || response.status >= 500;
          check((await db.from("trendyol_stock_queue").update({ state: retry ? "pending" : "failed", attempts: row.attempts + 1, next_attempt_at: new Date(Date.now() + Math.min(900000, 60000 * 2 ** Math.min(row.attempts, 4))).toISOString(), last_error: `Stock request failed (${response.status}): ${JSON.stringify(result).slice(0, 5000)}` }).eq("id", row.id).eq("version", row.version)).error);
        }
        break;
      }
      // Preserve new versions that arrived in-flight; mark all as submitted until this batch completes.
      for (const row of rows) check((await db.from("trendyol_stock_queue").update({ state: "submitted", batch_id: result.batchRequestId, sent_version: row.version, next_attempt_at: new Date(Date.now() + 60000).toISOString(), last_error: null }).eq("id", row.id)).error);
      check((await db.from("trendyol_sync_runs").insert({ user_id: userId, action: "sync-stock-auto", status: "pending", batch_id: result.batchRequestId, product_ids: rows.map(r => r.product_id), result: { ...result, items } })).error);
      submitted += items.length;
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    return json({ submitted });
  } catch (error) {
    console.error("Stock processor failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Stock processing interrupted; pending updates will retry" }, 500);
  } finally {
    await db.rpc("release_trendyol_stock_worker", { p_token: lease });
  }
});