export const SELLER_ID = "1360871";
export const STOREFRONT = "SA";
export const BASE_URL = "https://apigw.trendyol.com";

export async function trendyolRequest(path: string, method = "GET", body?: unknown) {
  const key = Deno.env.get("TRENDYOL_API_KEY");
  const secret = Deno.env.get("TRENDYOL_API_SECRET");
  if (!key || !secret) throw new Error("Trendyol credentials are not configured");
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
      "User-Agent": `${SELLER_ID} - SelfIntegration`,
      storeFrontCode: STOREFRONT,
      "Accept-Language": "en",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  // Never expose credentials, even if an upstream error reflects a request header.
  const safeText = [key, secret, btoa(`${key}:${secret}`)].reduce(
    (value, credential) => value.split(credential).join("[redacted]"), text,
  );
  let data: unknown;
  try { data = JSON.parse(safeText); } catch { data = { message: safeText.slice(0, 6000) }; }
  return { ok: response.ok, status: response.status, data };
}