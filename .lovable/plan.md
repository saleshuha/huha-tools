

## Redesign: Purchase Log Tab as Purchase Link History

### What Changes

Replace the current empty Purchase Log tab (which reads from `market_purchases` -- 0 records) with a rich log view that pulls from `market_purchase_links` (your actual purchase data -- 7 links with 24-35 items each).

### New Layout

**Summary Cards Row** (top)
- Total Links created
- Total Items across all links
- Items with supplier assigned
- Total cost of assigned items

**Link History List** (main content)
Each link displayed as an expandable card showing:
- Title, date created, platform badge, status (Active/Inactive)
- Item count + assigned count progress
- Total estimated cost

**Expanded View** -- shows items grouped by supplier:
- Supplier name as section header
- Each item: thumbnail image, title (truncated), ASIN, SKU, qty, unit cost, total
- "Unassigned" group for items without a supplier
- Quick link to open the public portal (copy link button)

**Filters toolbar**:
- Search by title/ASIN/SKU
- Filter by status (All / Active / Inactive)
- Date range

**Mobile-first**: Cards layout on small screens, no horizontal-scrolling table.

### Technical Changes

**File: `src/components/market-purchases/PurchaseLogTab.tsx`** -- Full rewrite

- Remove dependency on `useMarketPurchases` hook (the `market_purchases` table)
- Use `useMarketPurchaseLinks` hook instead (reads `market_purchase_links`)
- Parse items JSONB to extract supplier groupings
- Each link card is expandable (Collapsible) to show items
- Items displayed in cards grouped by `supplier_name` field from the JSONB items array
- Product images use the same Amazon URL pattern: `https://m.media-amazon.com/images/P/{asin}.01._SCLZZZZZZZ_SX44_.jpg`
- Image click opens preview dialog (reuse the Dialog pattern from MarketPurchasePublic)
- Copy link button constructs URL: `/market-purchase/{link_token}`

**File: `src/pages/MarketPurchases.tsx`** -- No changes needed (already imports PurchaseLogTab)

**No new dependencies** -- uses existing hooks, UI components, and patterns.

### Data Flow

The tab reads from `market_purchase_links` table which stores:
- `items` (JSONB array): each item has `asin`, `sku`, `title`, `qty`, `unit_cost`, `supplier_name`, `noon_image_key`
- `title`, `platform`, `is_active`, `created_at`
- `supplier_id` (link-level), `link_token`

Items are grouped by their `supplier_name` field within each link for the expanded view.

### What Gets Removed

- The `NewPurchaseDialog` button and import (the old manual purchase logging flow using `market_purchases` table)
- The old table with Date/Supplier/Platform/Items/Est.Total/Status columns
- The `useMarketPurchases` import from this file
- Filter logic tied to the old data model

The `NewPurchaseDialog` component file itself stays untouched in case it's used elsewhere, but it will no longer be referenced from this tab.
