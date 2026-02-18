

## Selective Item-Level Purchase Link Generation

Currently, the "Generate Link" button creates a purchase link for ALL items across the selected POs. This plan adds the ability to generate links for only **specific filtered/searched items** -- giving you precise control over what goes into each purchase link.

---

### How It Will Work

1. **New "Selected Items" mode in the Generate Link dialog**: When you click "Generate Link", the dialog will show a summary of items based on your current filters/search, not just PO numbers. You can review and remove individual items before generating.

2. **Item IDs stored on the link**: The `purchase_links` table will get a new optional column `po_order_ids` (UUID array). When specific items are selected (not full POs), these IDs are stored alongside `po_numbers`. The edge function will use `po_order_ids` to fetch only those specific items instead of all items from the POs.

3. **Backward compatible**: If `po_order_ids` is null/empty, the system falls back to fetching all items by `po_numbers` (existing behavior).

---

### Changes

**Database**:
- Add `po_order_ids UUID[]` column to `purchase_links` table (nullable, default null)

**Edge Function** (`purchase-link-handler/index.ts`):
- `/generate` endpoint: Accept optional `poOrderIds` array and store it
- `/data/:token` endpoint: If `po_order_ids` is populated, fetch only those specific rows by ID instead of all items from the PO numbers

**Frontend**:

- **`GeneratePurchaseLinkDialog.tsx`**: 
  - Accept new prop `filteredOrderIds` (the IDs of currently visible/filtered items)
  - Show item count and a preview of which items will be included
  - Add a toggle: "All items from selected POs" vs "Only filtered items (X items)"
  - Pass `poOrderIds` to the generate request when filtered mode is chosen

- **`POTracker.tsx`**: 
  - Pass the current `filteredOrders` (filtered by search/tags/status) item IDs to the dialog
  - The dialog receives both the PO numbers AND the filtered item IDs

- **`src/types/purchase-link.ts`**: 
  - Add `poOrderIds?: string[]` to `GenerateLinkRequest`

---

### Technical Details

**New column migration:**
```sql
ALTER TABLE purchase_links 
ADD COLUMN po_order_ids UUID[] DEFAULT NULL;

COMMENT ON COLUMN purchase_links.po_order_ids IS 
  'Optional specific item IDs. When set, only these items are included instead of all items from po_numbers.';
```

**Edge function data fetch logic change:**
```
If link.po_order_ids is not empty:
  Fetch po_orders WHERE id IN (po_order_ids)
Else:
  Fetch po_orders WHERE po_number IN (po_numbers)  -- existing behavior
```

**File count**: 1 migration, 4 modified files (dialog, POTracker, types, edge function)

