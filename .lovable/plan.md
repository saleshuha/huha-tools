

## Bulk Push Local Inventory to Shopify (with Images)

### What We'll Build

A new feature in the **Products tab** that lets you select in-stock inventory items from `asin_inventory` and create them as new Shopify products in bulk — pulling all available details (title, SKU, price, quantity) and product images from the `product_images` table.

### How It Works

1. **New Edge Function action `bulk-create-from-inventory`** in `shopify-sync/index.ts`:
   - Accepts a list of SKUs (or "all not-matched")
   - Queries `asin_inventory` for item details (title, SKU, quantity, status) grouped by SKU
   - Queries `product_images` for matching ASIN image URLs
   - For each item, calls Shopify `POST /admin/api/2024-01/products.json` with title, SKU, quantity (set via inventory_levels/set), images, and the `zurwa-warehouse` tag
   - Sets inventory at the configured location
   - Returns success/failure counts

2. **New UI in `ShopifyProductManager.tsx`** — "Push Inventory to Shopify" button/section:
   - Fetches local inventory items that are **not yet matched** to any Shopify product (compares local SKUs vs existing Shopify SKUs)
   - Displays a selectable table showing: image thumbnail, title, SKU, quantity
   - "Push Selected to Shopify" button that triggers bulk creation
   - Progress indicator and result summary toast

### Data Flow

```text
asin_inventory (SKU, title, qty, ASIN)
       ↓
product_images (ASIN → image_url)
       ↓
Edge Function: bulk-create-from-inventory
       ↓
Shopify POST /products.json (title, SKU, images, tags: "zurwa-warehouse")
       ↓
Shopify POST /inventory_levels/set.json (quantity at location)
```

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shopify-sync/index.ts` | Add `bulk-create-from-inventory` action — fetches inventory + images from DB, creates Shopify products with images and sets inventory levels |
| `src/components/shopify/ShopifyProductManager.tsx` | Add "Push Inventory to Shopify" section with unmatched items table, image previews, selection, and bulk push button |

### Key Details
- Images are pulled from the existing `product_images` table (matched by ASIN) — no manual image URL entry needed
- Products are created with the `zurwa-warehouse` tag automatically
- Only items with `is_active = true` and a non-null SKU are included
- SKUs already existing in Shopify are excluded from the push list
- Inventory quantity is set at the configured `location_id` after product creation

