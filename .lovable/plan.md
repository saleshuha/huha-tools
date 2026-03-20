

# Stock Audit: ASIN-Based Scanning with Quantity Tracking

## Current Problem
The audit system scans by **serial number** (individual item tracking), but physical products have **ASIN barcodes**. Multiple units share the same ASIN, so we need to track **quantity per ASIN** — either by scanning repeatedly or entering qty manually.

## Core Changes

### 1. Shift from Serial-Based to ASIN-Based Matching (`useStockAudit.ts`)

**Current**: `resolveBarcode()` looks up `serial_number` → matches one inventory row.
**New**: `resolveBarcode()` looks up by **ASIN first** (direct match against `asin_inventory.asin`), then falls back to `product_barcodes.barcode → ASIN`. Returns all inventory items for that ASIN grouped together.

**Quantity tracking**:
- Group inventory by ASIN → compute `systemQty` (sum of all rows for that ASIN)
- Track `scannedQty` per ASIN across all scans in the session
- Each scan increments qty by 1 (repeat-scan mode) or by user-entered amount (manual-qty mode)
- Duplicate detection changes: instead of blocking duplicates, we **accumulate** quantity. Only warn if scanned qty exceeds system qty.

**Progress calculation**: Based on unique ASINs verified (scannedQty > 0) vs total unique ASINs in system.

### 2. Scanner UI Overhaul (`AuditScanner.tsx`)

- **Scan input**: Accept ASIN codes (not serial numbers). Update placeholder text.
- **Quantity mode toggle**: Two modes side-by-side:
  - **Multi-scan mode** (default): Each scan/submit adds +1 to that ASIN's count. Shows running tally.
  - **Manual qty mode**: After scanning/entering ASIN, show a qty input field. User enters the count and submits.
- **Last scan result card**: Show ASIN, product title, system qty, and **scanned qty so far** with a visual comparison (e.g., "5 / 10 scanned").
- **Over-scan warning**: If scanned qty > system qty, show amber warning.
- **Quick qty adjustment**: Allow +/- buttons on recent scans to correct mistakes.

### 3. Review Panel Updates (`AuditReviewPanel.tsx`)

- **Scanned tab**: Group by ASIN, show columns: ASIN, Title, System Qty, Scanned Qty, Difference.
- **Missing tab**: Show ASINs with 0 scans (completely unscanned) and partially scanned (scanned < system).
- **Summary stats**: Show "Fully Verified", "Partially Scanned", "Not Scanned" counts.

### 4. Finalization Logic Update (`useStockAudit.ts` → `finalizeAudit`)

- For each ASIN: set inventory quantity = scanned quantity (not just 0/keep).
- Unscanned ASINs → qty = 0.
- Partially scanned ASINs → qty = scanned amount.

### 5. Database: Update scan records

Add/use `scanned_quantity` field on `stock_audit_scans` to store qty per scan entry. The existing column already supports this (default 1).

### 6. UI Improvements

- **Sound/vibration feedback** on successful scan (navigator.vibrate).
- **Running totals bar** showing: X ASINs fully verified, Y partially, Z missing.
- **Auto-focus** back to input after each scan for rapid scanning.
- **Scan history** grouped by ASIN with expandable qty details.

## Files Modified

- **`src/hooks/useStockAudit.ts`** — ASIN-based resolution, qty accumulation, grouped data helpers, updated finalization
- **`src/components/stock-audit/AuditScanner.tsx`** — qty mode toggle, ASIN-focused UI, over-scan warnings, quick adjust
- **`src/components/stock-audit/AuditReviewPanel.tsx`** — grouped-by-ASIN tables, partial scan tracking
- **`src/components/stock-audit/AuditFinalizeDialog.tsx`** — updated summary showing qty adjustments
- **`src/pages/StockAudit.tsx`** — pass new props

