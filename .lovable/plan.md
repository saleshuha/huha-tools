

## Fix Product Images + Cleaner UI Design

### Problem: Images Not Showing

The `product_images` table has 7,447 images and they exist for the ASINs in the purchase link orders. However, the edge function queries `product_images` with `.in('asin', asins)` where `asins` contains **2,500+ unique values**. PostgREST has a URL length limit, and when passing 2,500+ ASINs via the `.in()` filter, the query silently fails or returns empty results.

### Fix: Batch ASIN Lookups in Edge Function

**File: `supabase/functions/purchase-link-handler/index.ts`**

Split the ASINs array into chunks of 200 and query `product_images` in multiple batches, then merge the results. This avoids exceeding PostgREST URL limits.

```text
// Instead of: .in('asin', allAsins)  // fails with 2500+ ASINs
// Do: chunk into groups of 200, query each batch, merge results
```

### UI Simplification

**File: `src/pages/PurchaseLink.tsx`**

Simplify item cards for a cleaner, more workable layout:

1. **Remove the left checkbox indentation** -- Move the checkbox into the top-right corner of each card to reclaim horizontal space on mobile
2. **Compact card layout** -- Title on top, ASIN/SKU/PO in a single line below, quantity + actions in a clean row
3. **Larger product images** -- Increase from 56px to 64px on mobile for better visibility
4. **Cleaner action row** -- Qty input, Save button, N/A button, and Scan button all in one row with consistent sizing
5. **Remove nested indentation** (the `ml-8` sections) -- Use full card width for all content
6. **Simplified filter bar** -- Remove the sort section from the sticky bar, put it inline with filter buttons

**File: `src/components/purchase-link/PurchaseSummaryHeader.tsx`**

Minor cleanup:
- Reduce ring size slightly on mobile
- Use number formatting (e.g., "3,945" instead of "3945")

### Technical Details

Files to modify:
- `supabase/functions/purchase-link-handler/index.ts` -- Batch ASIN lookups in chunks of 200 to fix image loading
- `src/pages/PurchaseLink.tsx` -- Simplify card layout, remove excess indentation, improve mobile usability
- `src/components/purchase-link/PurchaseSummaryHeader.tsx` -- Number formatting

