

# External App Sync Integration

## What This Does

Adds a new tab "App Sync" to the existing Shopify Sync page (or a new dedicated page) that connects your local inventory to the other Lovable app's `product-sync` webhook. When you create, edit, delete, or update inventory items, the changes are pushed to the external app via its webhook API.

## Architecture

```text
┌──────────────────────┐         POST /product-sync
│  This App (Huha)     │  ───►   https://crcrrejwzouyysadrrpv.supabase.co
│                      │         /functions/v1/product-sync
│  asin_inventory      │         Authorization: Bearer SYNC_API_KEY
│  + product_images    │
└──────────────────────┘
         │
    Edge Function
    "external-app-sync"
    (proxies calls with
     the API key stored
     server-side)
```

## Implementation

### 1. Store the Sync API Key as a Secret

Add `EXTERNAL_APP_SYNC_KEY` as a Supabase edge function secret. This is the shared token that the other app's `product-sync` endpoint validates.

### 2. DB Table: `external_sync_config`

Stores per-user configuration:
- `user_id`, `webhook_url` (default: the URL above), `api_key_label`, `sync_enabled`, `last_synced_at`

### 3. Edge Function: `external-app-sync`

A new edge function that:
- Accepts actions: `sync-inventory`, `create-product`, `update-product`, `delete-product`, `test-connection`
- Reads `EXTERNAL_APP_SYNC_KEY` from env
- Forwards requests to `https://crcrrejwzouyysadrrpv.supabase.co/functions/v1/product-sync` with `Authorization: Bearer <key>`
- For **sync-inventory**: reads all `asin_inventory` items and sends bulk payload
- For **create/update**: sends individual product data (ASIN, SKU, title, quantity, images)
- For **delete**: sends the product identifier to remove
- For **test-connection**: pings the webhook to verify it responds

### 4. New UI Components

**`src/components/external-sync/ExternalSyncSettings.tsx`**
- Webhook URL field (pre-filled with the known URL)
- API Key input (stored in `external_sync_config`)
- Test Connection button
- Auto-sync toggle

**`src/components/external-sync/ExternalSyncDashboard.tsx`**
- "Push All Inventory" button — bulk syncs all active inventory to the other app
- Progress bar for bulk operations
- Last sync timestamp
- Quick stats: items synced, failed, pending

**`src/components/external-sync/ExternalSyncHistory.tsx`**
- Log of sync operations with status, timestamp, items affected

### 5. Add to Shopify Sync Page

Add a new tab "External App" to the existing `ShopifySyncPage.tsx` tabs. This keeps all sync features in one place.

### 6. Auto-Sync on Inventory Changes (optional toggle)

When enabled, inventory quantity changes trigger a push to the external app via the edge function (similar to how Shopify auto-sync works).

## Technical Details

### Edge Function Payload Format (best-guess based on common patterns)

```json
// sync-inventory / create-product
{
  "action": "sync_inventory",
  "products": [
    {
      "asin": "B0XXXXX",
      "sku": "SKU123",
      "title": "Product Name",
      "quantity": 10,
      "image_url": "https://...",
      "status": "in-stock"
    }
  ]
}

// delete-product
{
  "action": "delete_product",
  "asin": "B0XXXXX"
}
```

Since I cannot access the other app's source code to confirm the exact payload format, the edge function will be designed to be easily adjustable. The Settings UI will also include a "Send Test Payload" button to verify the format works.

### Secret Management

The API key will be stored as a Supabase secret (`EXTERNAL_APP_SYNC_KEY`) accessible by the edge function. Users enter the webhook URL and can test the connection from the UI.

## Files

- **Create**: `supabase/functions/external-app-sync/index.ts` — edge function proxy
- **Create**: `src/components/external-sync/ExternalSyncSettings.tsx` — config UI
- **Create**: `src/components/external-sync/ExternalSyncDashboard.tsx` — sync dashboard
- **Modify**: `src/pages/ShopifySyncPage.tsx` — add "External App" tab
- **DB Migration**: create `external_sync_config` and `external_sync_log` tables

