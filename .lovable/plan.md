

## Plan: Fulfillment Print Preview Dialog

### What
Create a new dedicated `FulfillmentPrintPreview` dialog specifically for the fulfillment filter's "Print Preview" button. Instead of reusing the generic label print dialog, this will show a fulfillment-focused table with serial numbers, quantities, and processing status — with print and CSV export.

### New File: `src/components/po-tracker/FulfillmentPrintPreview.tsx`

A dialog similar in structure to `SnapshotPrintPreview` but tailored for fulfillment data:

**Columns:**
- `#` — Row number
- `ASIN / SKU` — Product identifiers
- `Title` — Product name (truncated)
- `PO Number` — Purchase order reference
- `PO Qty` — Original order quantity
- `Fulfilled Qty` — Extracted from order notes (`Fulfilled from stock: X`)
- `Pending Qty` — `PO Qty - Fulfilled Qty`
- `Serial Number(s)` — From inventory match (same logic as SnapshotPrintPreview)
- `In-Stock Qty` — Current inventory quantity
- `Fulfillment Status` — Badge: "Fully Fulfilled" (green), "Partially Fulfilled" (yellow), "Not Fulfilled" (red)

**Features:**
- Sortable columns (fulfilled qty, pending qty, serial number, in-stock, status)
- Summary stats bar at top: Total Items, Total Fulfilled, Total Pending, Fully Fulfilled count, Partially Fulfilled count
- Sticky header and footer with aggregate totals
- Print button (`window.print()`) with print CSS
- CSV export with all columns including serial numbers and fulfillment status
- Zebra-striped rows, same professional styling as SnapshotPrintPreview

### Modified File: `src/components/POTracker.tsx`

1. Import `FulfillmentPrintPreview`
2. Add state: `fulfillmentPreviewOpen` boolean, `fulfillmentPreviewOrders` array
3. Change the fulfillment "Print Preview" button (line 6034) to open the new dialog instead of the generic print dialog:
   - Set `fulfillmentPreviewOrders` to the filtered orders
   - Set `fulfillmentPreviewOpen = true`
4. Render the `FulfillmentPrintPreview` dialog, passing orders + `findInventoryMatch`

### Data Extraction Logic

Fulfillment data is parsed from `order.notes` field:
```text
order.notes?.match(/Fulfilled from stock:\s*(\d+)/) → fulfilled quantity
```

Serial numbers come from `findInventoryMatch()` — same approach as SnapshotPrintPreview.

### Files
- **Created**: `src/components/po-tracker/FulfillmentPrintPreview.tsx`
- **Modified**: `src/components/POTracker.tsx` — wire button to new dialog

