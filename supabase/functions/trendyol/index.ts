import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { SELLER_ID, STOREFRONT, trendyolRequest } from "./connection.ts";

const requestSchema = z.object({ action: z.literal("test-connection") }).strict();
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
    const result = await trendyolRequest(`/integration/order/sellers/${SELLER_ID}/orders?page=0&size=1`);
    if (!result.ok) {
      console.error("Trendyol connection failed", result.status, JSON.stringify(result.data));
      return json({ error: "Trendyol rejected the connection", status: result.status, details: result.data }, result.status);
    }
    return json({ connected: true, sellerId: SELLER_ID, storefront: STOREFRONT });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Connection failed" }, 500);
  }
});