

## Plan: Auto-Sync Inventory to Shopify on Stock Changes

### How It Works

When `sync_enabled` is true in `shopify_config`, any quantity change in `asin_inventory` will automatically trigger a sync to Shopify. The mechanism:

1. **Enable `pg_net` extension** — allows making HTTP requests from inside PostgreSQL triggers
2. **Create a trigger function** on `asin_inventory` that fires `AFTER UPDATE` when `quantity` changes
3. The trigger looks up the user's `shopify_config` — if `sync_enabled = true` and credentials exist, it calls the `shopify-sync` edge function via `net.http_post()` with the updated SKU and quantity
4. **Update the UI** to remove "(coming soon)" from the auto-sync toggle and persist the `sync_enabled` flag properly

### Database Changes (Migration)

- Enable `pg_net` extension
- Create function `trigger_shopify_auto_sync()`:
  - Fires on `AFTER UPDATE OF quantity ON asin_inventory`
  - Checks if `OLD.quantity != NEW.quantity`
  - Looks up `shopify_config` for the user where `sync_enabled = true`
  - If found, calls `net.http_post()` to the `shopify-sync` edge function with `action=sync` and the item's SKU + new quantity
  - Uses the service role key (stored as a Supabase secret) for auth
- Create the trigger on `asin_inventory`

### Edge Function Changes (`shopify-sync`)

- No major changes needed — the existing `sync` action already accepts `items: [{sku, local_quantity}]` and processes them
- Add a small guard so the function works when called from the trigger (service role auth)

### UI Changes (`ShopifySettings.tsx`)

- Remove "(coming soon)" text from the auto-sync toggle (line 260)
- Ensure `sync_enabled` is saved to the database when toggled

### Files to Modify
- **Database migration** — enable `pg_net`, create trigger function + trigger
- `src/components/shopify/ShopifySettings.tsx` — update auto-sync label
- `supabase/functions/shopify-sync/index.ts` — minor: allow service-role auth for trigger calls

