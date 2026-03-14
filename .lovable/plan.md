

## Plan: Snapshot Lock Print Preview

### What
Add a "Print Preview" button next to the existing "Clear & Refresh" button in the snapshot lock indicator bar. Clicking it opens a dialog with a printable report of all currently locked/filtered items, showing key details: In-Stock Qty, Serial Number(s), PO Qty, Printed Qty, and Pending Qty. The dialog includes a browser print button.

### New File

**`src/components/po-tracker/SnapshotPrintPreview.tsx`**
- A dialog component receiving the locked `ordersToDisplay` array and `findInventoryMatch` function
- Renders a print-optimized table with columns:
  - **#** (row number)
  - **ASIN / SKU** 
  - **Title**
  - **PO Number(s)**
  - **In-Stock Qty** (from inventory match)
  - **Serial Number(s)** (from inventory match — `serialNumbers[]` or `serialNumber`)
  - **PO Qty** (total ordered)
  - **Printed Qty**
  - **Pending Qty** (PO Qty - Printed Qty)
  - **Status** (Printed / Partial / Pending)
- Summary footer with totals: Total Items, Total PO Qty, Total Printed, Total Pending, Total In-Stock
- Active filters displayed at the top as a header row (which filters are applied)
- "Print" button uses `window.print()` with `@media print` styles scoped to the dialog
- "Export CSV" button to download the same data

### Modified File

**`src/components/POTracker.tsx`**
- Import `SnapshotPrintPreview`
- Add state `snapshotPrintOpen` (boolean)
- In the snapshot lock indicator (line ~5738-5753), add a `FileText` icon button labeled "Print Preview" next to "Clear & Refresh"
- Pass `ordersToDisplay`, `findInventoryMatch`, and active filter names to the dialog

### Data Flow

```text
Snapshot Lock active → user clicks "Print Preview"
  → SnapshotPrintPreview dialog opens
  → Iterates ordersToDisplay (already locked/filtered)
  → For each order: findInventoryMatch() → gets instock qty + serial numbers
  → Pending = order.quantity - order.printed_quantity
  → Renders print-ready table
  → Print / Export CSV
```

No new data fetching — all data is already available in the locked snapshot and inventory maps.

