

## Consolidate Duplicate ASINs into Single Cards

### Problem
When the same ASIN appears across multiple PO numbers, each instance shows as a separate card. The vendor sees many duplicate product cards instead of one card with the total required quantity summed up.

### Solution
Group orders by ASIN on the frontend, display one card per unique ASIN with the summed total required quantity, and distribute the purchased quantity across underlying orders when saving.

### How It Works

**Grouping Logic** (new `useMemo` in `PurchaseLink.tsx`):
- Group all `poOrders` by ASIN (fall back to SKU, then order ID for items without ASIN/SKU)
- Each group becomes one displayed card with:
  - `totalRequired` = sum of all orders' quantities
  - `totalPurchased` = sum of all related updates' purchased quantities
  - `orderIds` = array of all underlying po_order IDs
  - `poNumbers` = list of all PO numbers (shown as badges)
  - Image and title from the first order in the group

**Status Calculation** (updated for groups):
- "purchased" if totalPurchased >= totalRequired
- "partial" if totalPurchased > 0 but < totalRequired
- "not_available" if ALL underlying orders are marked N/A
- "pending" otherwise

**Saving** (updated `handleSaveItem`):
- When vendor enters a purchased quantity for a grouped item, distribute across the underlying orders sequentially (fill each order up to its required qty before moving to next)
- All underlying `po_order_id`s get their own `purchase_updates` row

**Bulk Actions / Selection**:
- Selecting a grouped card selects all its underlying order IDs
- Bulk mark purchased distributes across all underlying orders

**Stats** remain accurate since they aggregate from the grouped data.

**Filter/Search** works on the grouped card's title, ASIN, SKU, and all associated PO numbers.

### Technical Details

**File: `src/pages/PurchaseLink.tsx`**

1. Add a `useMemo` that creates `groupedOrders` from `data.poOrders`:
   - Key by ASIN (or SKU or ID as fallback)
   - Each group: `{ key, orders: Order[], totalRequired, totalPurchased, image, title, asin, skuCode, poNumbers, orderIds }`

2. Update `filteredOrders` to filter/sort `groupedOrders` instead of raw orders

3. Update `getItemStatus` to work with grouped totals

4. Update `handleSaveItem` to accept a group key, distribute qty across underlying orders

5. Update `handleMarkNotAvailable` / `handleUndoNotAvailable` to apply to all orders in the group

6. Update `handleSelectItem` to toggle all order IDs in the group

7. Update the card rendering to show:
   - Total required qty (summed)
   - Multiple PO number badges
   - Single qty input for the whole group

8. Update `stats` calculation to use grouped data

9. Update `exportData` to reflect grouped view

