

## Plan: Fix Sunsky Cost Scan — Reliability, Caching, Pause/Resume

### Issues Identified

1. **False "Not Found" results**: The code checks `result?.result === 'success' && result?.data?.product` but the edge function returns `{ result: 'success', data: result.data || result }` — the product data structure may not have a `product` key. The actual Sunsky API response nests data differently, so the price extraction path (`product.price || product.originalPrice`) may be wrong.

2. **No caching**: Every scan re-fetches all items from the API even if costs were already fetched previously.

3. **No pause/resume**: Only stop exists, no way to pause and continue.

4. **Scans all inventory regardless of stock**: Should scan ALL items with SKUs (not just in-stock), then calculate cost only for in-stock units.

---

### Implementation Steps

#### 1. Add `sunsky_product_costs` cache table (DB migration)
- Columns: `id`, `user_id`, `sku_code` (unique per user), `cost`, `title`, `currency`, `fetched_at`, `created_at`, `updated_at`
- RLS policies for user isolation
- This separates cached API costs from the manually-managed `sunsky_skus` table

#### 2. Fix API response parsing in `SunskyCostAnalyzer.tsx`
- Log and handle the actual response structure from `handleGetProductDetails`
- The edge function returns `{ result: 'success', data: ... }` where `data` is the raw Sunsky response (not wrapped in `.product`)
- Fix price extraction to check multiple paths: `data.price`, `data.originalPrice`, `data.priceUs`, etc.
- Handle the `result: 'error'` case properly (currently the code checks `result?.result === 'success'` but the edge function may return errors differently via `response.error`)

#### 3. Save fetched costs to database
- After successfully fetching a cost from the API, upsert into `sunsky_product_costs` table
- On scan start, first check `sunsky_product_costs` (and `sunsky_skus`) for cached costs before hitting the API
- Three-tier lookup: `sunsky_product_costs` cache → `sunsky_skus` local table → live API

#### 4. Scan all SKU items, calculate cost for in-stock only
- Fetch costs for all items with valid SKUs (regardless of stock level)
- Display in-stock quantity and calculate total cost based on current in-stock units only
- Show items with 0 stock as "costed but no stock"

#### 5. Add Pause/Resume functionality
- Replace the simple `cancelRef` boolean with a state machine: `idle` | `scanning` | `paused` | `complete`
- Add a "Pause" button that sets state to `paused` — the scan loop awaits until resumed
- Add "Resume" button to continue from where it left off
- Keep "Stop" button to fully cancel

#### 6. Update the UI
- Add pause/resume buttons in the footer
- Show scan state (Scanning / Paused / Complete)
- Update summary cards to distinguish "costed items" vs "in-stock costed items"

### Files to Create/Modify
- **New migration**: Create `sunsky_product_costs` table
- **Edit**: `src/components/SunskyCostAnalyzer.tsx` — fix parsing, add caching, add pause/resume, scan all items

