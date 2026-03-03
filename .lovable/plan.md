

## Plan: Shopify Inventory Sync via Admin API

### Overview
Build a new "Shopify Sync" page accessible from the sidebar that connects your Shopify store using the Admin API. When inventory quantities change in `asin_inventory`, the system syncs those changes to your Shopify store automatically.

### How It Works

1. **You provide**: Your Shopify store domain (e.g., `mystore.myshopify.com`) and an Admin API access token (created in Shopify Admin → Settings → Apps → Develop apps)
2. **We store**: Credentials securely in Supabase (encrypted in a `shopify_config` table)
3. **Products are matched**: By SKU — your `asin_inventory.sku` matches Shopify's product variant SKU
4. **Sync triggers**: Manual "Sync Now" button + option for automatic sync when stock changes

### Architecture

```text
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Shopify Sync   │──────▶│  Edge Function   │──────▶│  Shopify    │
│  Page (React)   │       │  shopify-sync    │       │  Admin API  │
└─────────────────┘       └──────────────────┘       └─────────────┘
        │                         │
        ▼                         ▼
┌─────────────────┐       ┌──────────────────┐
│  shopify_config │       │  shopify_sync_   │
│  (credentials)  │       │  log (history)   │
└─────────────────┘       └──────────────────┘
```

### Implementation Steps

#### 1. Database: Create two tables
- **`shopify_config`**: Stores store domain, API token (encrypted), last sync timestamp, sync enabled flag
- **`shopify_sync_log`**: Records each sync action (SKU, old qty, new qty, status, timestamp) for audit trail

#### 2. Edge Function: `shopify-sync`
- Accepts list of SKUs + quantities from the client
- Reads Shopify credentials from `shopify_config`
- Calls Shopify Admin API: `GET /admin/api/2024-01/products.json?fields=id,variants` to find variant by SKU
- Then calls `POST /admin/api/2024-01/inventory_levels/set.json` to update inventory level
- Logs results to `shopify_sync_log`

#### 3. New Page: `/shopify-sync`
- **Settings tab**: Enter/update Shopify store URL and Admin API token, test connection
- **Sync tab**: Shows inventory comparison table (Local qty vs Shopify qty), with "Sync All" or per-item sync buttons
- **History tab**: Shows sync log with status badges (success/failed)

#### 4. Sidebar: Add "Shopify Sync" button
- New top-level sidebar item with a `Store` icon under the Inventory section

### Files to Create/Modify
- **New**: `supabase/functions/shopify-sync/index.ts` (edge function)
- **New**: `src/pages/ShopifySyncPage.tsx` (main page)
- **New**: `src/components/shopify/ShopifySettings.tsx` (config form)
- **New**: `src/components/shopify/ShopifyInventorySync.tsx` (sync table)
- **New**: `src/components/shopify/ShopifySyncHistory.tsx` (log viewer)
- **Edit**: `src/components/AppSidebar.tsx` (add sidebar item)
- **Edit**: `src/App.tsx` (add route)
- **DB migration**: Create `shopify_config` and `shopify_sync_log` tables

### Security
- Shopify API token stored in `shopify_config` table (not in code)
- Edge function validates auth before accessing credentials
- All API calls go through the edge function (token never exposed to browser)

