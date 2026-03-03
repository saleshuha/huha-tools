

## Root Cause Analysis

The token `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` is confirmed to be a **Storefront API access token** (the `shpss_` prefix means "Shopify Storefront"). This is a different credential from what we need.

In Shopify's Develop apps, the **API credentials** tab shows multiple credentials:
- **API key** (Client ID) — for OAuth, not API calls
- **API secret key** (Client Secret) — for webhook verification, not API calls  
- **Storefront API access token** (`shpss_...`) — only for storefront/public queries, cannot manage inventory
- **Admin API access token** — this is what we need, but it is **only shown once** right after you click "Install app"

You are likely copying the **Storefront API access token** or the **API secret key**. Neither will work for inventory management.

## What You Need To Do In Shopify

The Admin API access token is only revealed once during app installation. Since you may have already installed the app and missed it, you need to:

1. Go to **Shopify Admin** → **Settings** → **Apps and sales channels** → **Develop apps**
2. Open your existing custom app
3. Click **Uninstall app** (this just removes the token, not the app config)
4. Click **Install app** again
5. A popup will show the **Admin API access token** — copy it immediately (it won't be shown again)
6. This token should start with `shpat_` (for public/custom apps)

If the token shown after install does NOT start with `shpat_`, it's still fine — paste it and test.

## Code Changes

### 1. Remove prefix-based blocking in ShopifySettings.tsx
The current code blocks all `shpss_` tokens from even being submitted. Instead, we should allow any token to be tested and let the actual API response determine if it works. We'll keep warnings as soft guidance only.

### 2. Improve error message from edge function  
When the API returns 401, show a message that specifically tells the user to look for the **Admin API access token** (not the API secret, not the Storefront token).

### 3. Update setup guide text
Replace the current guide with clearer instructions that distinguish between the multiple credentials shown in Shopify's UI, emphasizing that they need to click "Install app" and copy the token from the popup that appears.

### Files to Modify
- `src/components/shopify/ShopifySettings.tsx` — remove hard blocks on `shpss_`, update guide text, improve error messages
- `supabase/functions/shopify-sync/index.ts` — improve 401 error message to be more specific about which credential to use

