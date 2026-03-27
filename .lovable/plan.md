

# Fix External App Sync to Match Actual API

## Problems

The edge function uses wrong action names and payload formats that don't match the external API:

1. **Test connection** sends `{ action: "ping" }` — not a valid action. The API only supports `upsert_product`, `delete_product`, `update_inventory`, `bulk_upsert`.
2. **Sync inventory** sends `{ action: "sync_inventory", products: [...] }` — should use `bulk_upsert` with the correct product schema (needs `name`, `slug`, `sku` fields).
3. **Create/update product** sends `create_product` / `update_product` — should use `upsert_product` with a `product` object (not array).
4. **Delete product** sends `{ action: "delete_product", asin }` — should send `{ action: "delete_product", sku }`.

## Changes

### 1. Edge Function (`supabase/functions/external-app-sync/index.ts`)

**Test connection:** Instead of sending `ping`, send a lightweight `upsert_product` dry-run or simply verify the endpoint responds with a GET/minimal request. Best approach: send `{ action: "bulk_upsert", products: [] }` — an empty array should return 200 without side effects, confirming auth works.

**Sync inventory (`sync-inventory` action):**
- Change forwarded action from `sync_inventory` to `bulk_upsert`
- Map each inventory item to the required schema:
  ```json
  {
    "name": item.title,
    "slug": slugify(item.asin),  // lowercase ASIN as slug
    "sku": item.sku || item.asin,
    "status": "active",
    "inventory": { "quantity": item.quantity }
  }
  ```
- Also fetch `product_images` for the user and attach image URLs where available
- Batch size stays at 100 (API limit) instead of current 50

**Create/update product:**
- Change to use `upsert_product` action
- Send `{ action: "upsert_product", product: { name, slug, sku, inventory: { quantity }, images, ... } }`
- Accept single product object, not array

**Delete product:**
- Send `{ action: "delete_product", sku: item.sku }` instead of `asin`

### 2. Settings (`src/components/external-sync/ExternalSyncSettings.tsx`)

- Update test connection result handling — the empty `bulk_upsert` may return `{ success: true }` or a 200 status, handle accordingly

### 3. Dashboard — no structural changes needed, just inherits the fixed edge function

## Files Modified
- **`supabase/functions/external-app-sync/index.ts`** — Fix all action names and payload formats to match the actual API
- **`src/components/external-sync/ExternalSyncSettings.tsx`** — Minor: improve test result display

