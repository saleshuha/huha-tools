

## Discovery: Shopify Has Deprecated Static Access Tokens

Based on the latest Shopify documentation (2026), **Shopify has removed the old "copy access token" workflow**. The "API credentials" tab in Develop apps no longer shows an Admin API access token you can copy. This is why you only see the Client ID and Client Secret — that's all Shopify provides now.

The solution is to use the **Client Credentials OAuth flow**, which uses your Client ID + Client Secret to obtain a short-lived access token (expires every 24 hours) automatically. This is the correct approach for syncing your own store's inventory.

## What Changes

### 1. Update `shopify_config` database table
- Add `client_id` and `client_secret` columns (replacing the single `api_token` field)
- Keep `api_token` for backward compatibility but it will now store the auto-fetched OAuth token

### 2. Rewrite `ShopifySettings.tsx` UI
- Replace the single "Admin API Access Token" field with two fields: **Client ID** and **Client Secret**
- Remove all token prefix warnings (no longer relevant)
- Update the setup guide to reflect the new OAuth flow
- Store domain + Client ID + Client Secret are saved; the edge function handles token exchange

### 3. Rewrite `shopify-sync` Edge Function
- Before making any Shopify API call, use the Client Credentials grant to fetch a fresh access token:
  ```
  POST https://{store}.myshopify.com/admin/oauth/access_token
  Content-Type: application/x-www-form-urlencoded
  Body: grant_type=client_credentials&client_id=XXX&client_secret=XXX
  ```
- Use the returned `access_token` for all API calls
- Token expires in 24h but is fetched fresh each invocation (edge functions are stateless)

### 4. Update `ShopifySyncPage.tsx`
- Remove the `isTokenInvalid` check based on `shpss_` prefix (no longer applicable)

## Files to Modify
- **Database**: Add `client_id` and `client_secret` columns to `shopify_config`
- `src/components/shopify/ShopifySettings.tsx` — new Client ID / Client Secret fields, updated guide
- `supabase/functions/shopify-sync/index.ts` — implement Client Credentials OAuth flow
- `src/pages/ShopifySyncPage.tsx` — remove token prefix check

## What You Need to Provide
After this change, you'll enter:
1. **Store Domain** — same as before
2. **Client ID** — the "Client ID" shown in your Shopify app credentials
3. **Client Secret** — the "Client Secret" shown in your Shopify app credentials

These are the two values you already have access to in your Shopify Develop apps page.

