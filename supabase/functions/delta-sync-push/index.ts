import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface QueueRow {
  id: string;
  asin: string;
  delta: number;
  reference_id: string | null;
  notes: string | null;
}

interface Config {
  user_id: string;
  base_url: string;
  api_key: string | null;
  source_label: string;
  auto_push_enabled: boolean;
}

async function pushForUser(admin: any, cfg: Config, mode: "auto" | "manual") {
  if (!cfg.api_key) return { user_id: cfg.user_id, skipped: "no_api_key" };
  if (mode === "auto" && !cfg.auto_push_enabled) {
    return { user_id: cfg.user_id, skipped: "auto_disabled" };
  }

  const { data: rows, error } = await admin
    .from("delta_sync_queue")
    .select("id, asin, delta, reference_id, notes")
    .eq("user_id", cfg.user_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) return { user_id: cfg.user_id, error: error.message };
  const queue = (rows ?? []) as QueueRow[];
  if (queue.length === 0) return { user_id: cfg.user_id, applied: 0 };

  const items = queue.map((r) => ({
    asin: r.asin,
    delta: r.delta,
    ...(r.reference_id ? { reference_id: r.reference_id } : {}),
    ...(r.notes ? { notes: r.notes } : {}),
  }));

  const url = cfg.base_url.replace(/\/$/, "") + "/api/public/sync/stock";
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: cfg.source_label || "huha-tools", items }),
    });
  } catch (e) {
    return { user_id: cfg.user_id, error: `network: ${(e as Error).message}` };
  }

  const ids = queue.map((r) => r.id);
  const text = await res.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch { body = { raw: text }; }

  if (res.status === 401 || res.status === 403) {
    await admin.from("delta_sync_config").update({
      last_test_status: res.status === 401 ? "invalid_key" : "revoked_key",
      last_test_at: new Date().toISOString(),
    }).eq("user_id", cfg.user_id);
    await admin.from("delta_sync_queue").update({
      status: "failed", error_message: body?.error || `HTTP ${res.status}`, pushed_at: new Date().toISOString(),
    }).in("id", ids);
    return { user_id: cfg.user_id, error: `auth ${res.status}` };
  }

  if (res.status === 429) {
    return { user_id: cfg.user_id, error: "rate_limited" };
  }

  if (!res.ok) {
    await admin.from("delta_sync_queue").update({
      status: "failed", error_message: body?.error ? JSON.stringify(body.error) : `HTTP ${res.status}`, pushed_at: new Date().toISOString(),
    }).in("id", ids);
    return { user_id: cfg.user_id, error: `HTTP ${res.status}` };
  }

  // 200 OK
  const results = (body.results || []) as Array<{ asin: string; delta: number; balance_after: number }>;
  const skipped = (body.skipped || []) as Array<{ asin: string; reason: string }>;

  // Map asin+delta -> balance_after (first match)
  const balanceByKey = new Map<string, number>();
  for (const r of results) {
    const k = `${r.asin}|${r.delta}`;
    if (!balanceByKey.has(k)) balanceByKey.set(k, r.balance_after);
  }
  const skippedAsins = new Set(skipped.map((s) => s.asin));
  const skippedReason = new Map(skipped.map((s) => [s.asin, s.reason]));

  const now = new Date().toISOString();
  // Update individually (small batch, max 500)
  for (const row of queue) {
    if (skippedAsins.has(row.asin)) {
      await admin.from("delta_sync_queue").update({
        status: "skipped", error_message: skippedReason.get(row.asin) || "skipped", pushed_at: now,
      }).eq("id", row.id);
    } else {
      const k = `${row.asin}|${row.delta}`;
      const bal = balanceByKey.get(k);
      await admin.from("delta_sync_queue").update({
        status: "sent", balance_after: bal ?? null, pushed_at: now,
      }).eq("id", row.id);
      // Pop the consumed balance so the next identical row gets a fresh value if any
      balanceByKey.delete(k);
    }
  }

  await admin.from("delta_sync_config").update({
    last_pushed_at: now,
    last_test_status: "ok",
    last_test_at: now,
  }).eq("user_id", cfg.user_id);

  return { user_id: cfg.user_id, applied: body.applied ?? results.length, skipped: skipped.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "POST" ? "push" : "push");

    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    const mode: "auto" | "manual" = body.mode === "manual" ? "manual" : "auto";

    // Identify caller (manual mode requires user JWT)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser(token);
      if (data?.user) userId = data.user.id;
    }

    // Test connection action
    if (body.action === "test" && userId) {
      const { data: cfg } = await admin
        .from("delta_sync_config")
        .select("base_url, api_key, source_label")
        .eq("user_id", userId)
        .single();
      if (!cfg?.api_key) {
        return new Response(JSON.stringify({ ok: false, error: "no_api_key" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const testUrl = cfg.base_url.replace(/\/$/, "") + "/api/public/sync/stock";
      const r = await fetch(testUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source: cfg.source_label || "huha-tools", items: [{ asin: "TEST_PROBE_0000", delta: 0 }] }),
      });
      const txt = await r.text();
      const ok = r.status === 200 || r.status === 400; // 400 is fine — means key is valid, body validation only
      await admin.from("delta_sync_config").update({
        last_test_status: ok ? "ok" : (r.status === 401 ? "invalid_key" : r.status === 403 ? "revoked_key" : `http_${r.status}`),
        last_test_at: new Date().toISOString(),
      }).eq("user_id", userId);
      return new Response(JSON.stringify({ ok, status: r.status, response: txt.slice(0, 500) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Push action
    let configs: Config[] = [];
    if (mode === "manual") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await admin
        .from("delta_sync_config")
        .select("user_id, base_url, api_key, source_label, auto_push_enabled")
        .eq("user_id", userId);
      configs = (data ?? []) as Config[];
    } else {
      const { data } = await admin
        .from("delta_sync_config")
        .select("user_id, base_url, api_key, source_label, auto_push_enabled")
        .eq("auto_push_enabled", true)
        .not("api_key", "is", null);
      configs = (data ?? []) as Config[];
    }

    const results = [];
    for (const cfg of configs) {
      results.push(await pushForUser(admin, cfg, mode));
    }

    return new Response(JSON.stringify({ mode, processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
