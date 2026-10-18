import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export class TrendyolApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "TrendyolApiError"; }
}

export async function trendyol<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to use Trendyol");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/trendyol`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Gateway returned a non-JSON page (e.g. function still deploying or unavailable).
    throw new TrendyolApiError(response.ok ? "Unexpected response from Trendyol service" : `Trendyol service unavailable (${response.status}); try again in a moment`, response.status);
  }
  if (!response.ok) throw new TrendyolApiError([data.error, data.status ? `(${data.status})` : "", data.details ? JSON.stringify(data.details) : ""].filter(Boolean).join(" "), response.status);
  return data;
}
