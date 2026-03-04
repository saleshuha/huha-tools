

## Create & Update Product Listings on Shopify

Yes, this is absolutely possible. Your app already has the Shopify Admin API connection (OAuth client credentials flow) and fetches products. We can extend the Edge Function and add a new UI tab to support **creating new products** and **updating existing product details** (title, price, description, etc.) on your Shopify store.

### What We'll Build

1. **New Edge Function actions** in `shopify-sync/index.ts`:
   - `create-product` — calls Shopify's `POST /admin/api/2024-01/products.json` to create a new product with title, description, price, SKU, quantity, images, etc.
   - `update-product` — calls Shopify's `PUT /admin/api/2024-01/products/{id}.json` to update an existing product's details (title, price, description, variant info).

2. **New UI component** `ShopifyProductManager.tsx`:
   - A form/dialog to **create a new product** with fields: title, description, price, SKU, quantity, vendor, product type, and optional image URL.
   - An **edit button** on matched/existing products in the inventory sync table (or a separate tab) that opens an edit dialog pre-filled with current Shopify data, allowing updates to title, price, description, etc.
   - Success/error feedback via toast notifications.

3. **New tab on ShopifySyncPage** — "Products" tab alongside Sync Inventory, Settings, and History, housing the product management UI.

### Technical Details

- **Shopify REST Admin API endpoints used**:
  - `POST /admin/api/2024-01/products.json` — create product
  - `PUT /admin/api/2024-01/products/{product_id}.json` — update product
- Authentication reuses the existing OAuth token flow already in the Edge Function.
- The create/update actions will be called from the frontend via `fetch()` to the Edge Function (matching your existing pattern) with `?action=create-product` or `?action=update-product`.
- Product data (title, body_html, vendor, product_type, variants with price/sku/inventory) will be sent in the request body.

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/shopify-sync/index.ts` | Add `create-product` and `update-product` action handlers |
| `src/components/shopify/ShopifyProductManager.tsx` | New component with create/edit product forms |
| `src/pages/ShopifySyncPage.tsx` | Add "Products" tab |

