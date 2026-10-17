import { supabase } from "@/integrations/supabase/client";

export async function trendyol<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to use Trendyol");
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trendyol`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error([data.error, data.status ? `(${data.status})` : "", data.details ? JSON.stringify(data.details) : ""].filter(Boolean).join(" "));
  return data;
}