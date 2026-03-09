

# Fix Inaccurate Printed Quantity in PO Print Document

## Problem
The printed quantity shown in the print document is inaccurate because it only counts `printed_quantity` from the **filtered** PO orders passed to the print dialog. For ASIN B0GDMCT67Z, there are two PO rows (qty 5 printed 5, qty 23 printed 23 = total 28 printed), but only one row's data reaches the aggregation depending on which filters/selections are active.

## Root Cause
`aggregatePOItemsByASIN()` and `convertOrdersToPrintItems()` only sum `printed_quantity` from the orders array they receive. If the user has a print status filter active (e.g., "not printed"), closed/fully-printed PO rows are excluded before reaching the print dialog — so the aggregated printed count is incomplete.

## Solution
When preparing print items in `POPrintDialog`, query the database for the **total** `printed_quantity` per ASIN across **all** PO orders for that user (not just the filtered subset). This ensures the printed count reflects reality regardless of which filters are active.

### Changes

**`src/components/po/POPrintDialog.tsx`** — In the `printItems` useMemo:
- After aggregating/converting items, fetch total printed quantities per ASIN from `po_orders` using a single query
- Use a `useEffect` + state pattern to async-fetch the true printed totals when the dialog opens
- Override each item's `printedQuantity` with the database total

**`src/utils/po-print-helpers.ts`** — Add a helper function:
```typescript
export const fetchTotalPrintedByASIN = async (asins: string[], userId: string) => {
  // Query po_orders grouped by ASIN, sum printed_quantity
  // Returns Map<asin, totalPrinted>
}
```

This queries all PO rows for each ASIN (regardless of status/filters) and returns the true total printed count.

**`src/components/po/POPrintDocument.tsx`** — No changes needed; it already displays `item.printedQuantity` which will now be accurate.

### PENDING calculation fix
The PENDING formula `quantity - inventoryQty - printedQuantity` will also become accurate since `printedQuantity` will reflect the true total.

