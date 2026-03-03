

## Plan: Fix Shopify Connection & Guide on API Setup

### Issues Found

1. **Edge function not deployed** — The `shopify-sync` function exists in code and config but was never deployed. This is why it returns 404.
2. **`location_id` is null** — Your config has `location_id: null`, which means sync operations will fail even after the function is deployed. The "Test Connection" button should fetch locations, but it can't work because the function isn't deployed.
3. **API token type** — Your stored token starts with `shpss_` which is a Storefront API token. You need an **Admin API** token (starts with `shpat_`) for inventory management.

### How to Create the Correct Shopify Admin API Token

Here are the step-by-step instructions:

1. Go to **Shopify Admin** → `https://retail-wholesale-hub-e5ju4.myshopify.com/admin`
2. Navigate to **Settings** → **Apps and sales channels** → **Develop apps**
3. If you don't see "Develop apps", click **Allow custom app development** first
4. Click **Create an app** → give it a name like "HuHa Inventory Sync"
5. Click **Configure Admin API scopes** and enable these permissions:
   - `read_products` — to read product/variant data
   - `write_products` — to update products
   - `read_inventory` — to read inventory levels
   - `write_inventory` — to update inventory levels
   - `read_locations` — to read location data
6. Click **Save**, then click **Install app**
7. Copy the **Admin API access token** (starts with `shpat_`)
8. Paste it in the Shopify Sync → Settings tab in your app

### Implementation Fix

#### 1. Deploy the edge function
The `shopify-sync` edge function needs to be deployed (it exists in code but wasn't deployed).

#### 2. Fix `verify_jwt` setting
Change from `false` to handle auth properly — currently it's `false` but the function manually validates the token, so this is fine. No change needed.

#### 3. Improve ShopifySettings error handling
- Add better error messages when the API token is wrong type (`shpss_` vs `shpat_`)
- Show a warning if the token doesn't start with `shpat_`
- After successful test connection, auto-save the selected location

#### 4. Add connection status indicator on the Sync tab
- Show whether Shopify is connected at the top of the sync page
- Display the store name and selected location

### Files to Modify
- **Deploy**: `supabase/functions/shopify-sync/index.ts` (deploy only, no code changes needed)
- **Edit**: `src/components/shopify/ShopifySettings.tsx` — add token format validation and better UX
- **Edit**: `src/pages/ShopifySyncPage.tsx` — add connection status indicator

