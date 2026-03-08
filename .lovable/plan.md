

# Noon FBPI Orders Integration with In-Stock Inventory

## Overview
Add a new page/tab for Noon Fulfilled by Partner Integration (FBPI) that connects to the Noon API to fetch orders and cross-references them with your local `asin_inventory` stock.

## Noon FBPI API Summary (from docs)

The FBPI flow is **webhook-driven**: Noon pushes orders to your system. You then use these endpoints (all require cookie-based auth via JWT login):

- **Auth**: `POST /identity/public/v1/api/login` — exchange RS256 JWT (signed with `private_key`, `key_id`, `project_code` from the service account JSON) for a session cookie
- **Get Order**: `GET /fbpi/v1/fbpi-order/:fbpi_order_nr/get` — fetch full order details
- **Update Order**: `POST /fbpi/v1/fbpi-order/update` — mark items out of stock before shipment
- **Create Shipment**: `POST /fbpi/v1/shipment/create` — create shipment with AWB

Base URL: `https://noon-api-gateway.noon.partners`

## What We'll Build

### 1. Database Changes
- Add API credential columns to `noon_stores_config`: `api_private_key` (encrypted text), `api_key_id`, `api_project_code`, `warehouse_code`
- Create `noon_fbpi_orders` table to store fetched FBPI orders with inventory match status

### 2. Edge Function: `noon-fbpi`
Handles all FBPI API interactions:
- **`authenticate`**: Signs a JWT using the store's `private_key`/`key_id`, calls Noon login endpoint, returns session cookie
- **`get-order`**: Fetches a specific FBPI order by order number
- **`check-inventory`**: Cross-references FBPI order item SKUs (`partner_sku`) against `asin_inventory` to show in-stock/out-of-stock status
- **`update-order`**: Marks out-of-stock items before shipment creation

### 3. New Page: `NoonFBPIPage`
Added at route `/noon-fbpi` with tabs:

- **Orders** tab: List of FBPI orders with inventory status (in stock / out of stock per SKU). Ability to fetch an order by number. Shows match against `asin_inventory.quantity`.
- **Settings** tab: Store selection + API credential configuration (private key, key ID, project code, warehouse code). Test connection button.
- **History** tab: Log of processed orders and actions taken.

### 4. Sidebar Entry
Add "Noon FBPI Orders" under the existing Noon section in the sidebar.

## Technical Details

### Auth Flow (Edge Function)
```text
Store credentials (DB) → Sign RS256 JWT → POST /identity/public/v1/api/login
→ Session cookie → Use cookie for subsequent FBPI API calls
```

The `node-forge` package (already installed) will be used in the edge function to sign RS256 JWTs in Deno.

### Inventory Matching Logic
For each FBPI order item with `partner_sku`:
1. Query `asin_inventory` where `sku = partner_sku`
2. Compare `asin_inventory.quantity` against order item count
3. Flag items as `in_stock`, `low_stock`, or `out_of_stock`
4. Allow bulk "Update Order" to mark OOS items on Noon's side

### Database Schema: `noon_fbpi_orders`
```text
id, user_id, store_id (FK noon_stores_config), fbpi_order_nr, mp_order_nr,
mp_code, mp_country_code, warehouse_code, currency_code, items (JSONB),
inventory_status (JSONB), status, order_created_at, fetched_at, processed_at
```

### New columns on `noon_stores_config`
```text
api_private_key TEXT (nullable) — RSA private key PEM
api_key_id TEXT (nullable) — service account key ID
api_project_code TEXT (nullable) — noon project code
warehouse_code TEXT (nullable) — FBPI warehouse code
```

## Files to Create/Modify
- **Create**: `supabase/functions/noon-fbpi/index.ts`
- **Create**: `src/pages/NoonFBPIPage.tsx`
- **Create**: `src/components/noon-fbpi/FBPIOrdersList.tsx`
- **Create**: `src/components/noon-fbpi/FBPISettings.tsx`
- **Create**: `src/components/noon-fbpi/FBPIOrderDetail.tsx`
- **Create**: `src/hooks/useNoonFBPI.ts`
- **Modify**: `src/App.tsx` — add route
- **Modify**: `src/components/AppSidebar.tsx` — add sidebar link
- **Migration**: Add columns to `noon_stores_config`, create `noon_fbpi_orders` table

