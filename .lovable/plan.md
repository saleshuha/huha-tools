

# Stock Audit: Multi-Search, Prominent Scan Feedback & UI Polish

## Changes

### 1. Search bar supports ASIN, SKU, and Serial Number (`AuditScanner.tsx`)
- Update placeholder to "Scan or type ASIN, SKU, or Serial Number..."
- Update `resolveBarcode` in `useStockAudit.ts` to check:
  1. Direct ASIN match (`asin === barcode`)
  2. SKU match (`sku === barcode`)
  3. Serial number match (`serial_number === barcode` or in `additional_serial_numbers`)
  4. Fallback to `product_barcodes` table
- When matched by SKU or serial, resolve to the parent ASIN and proceed as before

### 2. Prominent last-scan result (`AuditScanner.tsx`)
- Make the "Last Scan Result" card larger and more visually striking:
  - Bigger icon, larger text for ASIN and title
  - Large qty badge (e.g., "5 / 10") with a circular progress indicator
  - Animate entry with a scale/fade transition
- Move it directly above the scanned list for visibility

### 3. Highlight recently-scanned row in the scanned ASINs list (`AuditScanner.tsx`)
- Track `lastScannedAsin` state
- When a row's ASIN matches the last scan, apply a pulsing highlight animation (ring + bg glow) that fades after ~3 seconds
- Auto-scroll the list to bring the highlighted row into view

### 4. Better qty controls in scanned list (`AuditScanner.tsx`)
- Make +/- buttons slightly larger and more tappable
- Show a small inline input between +/- that allows direct qty editing (click the badge to toggle to input mode)
- Add a subtle color gradient on the qty badge based on completion percentage

### 5. UI polish across all components
- **Scanner card**: Add subtle gradient header, cleaner spacing
- **Progress card**: Use a segmented progress bar (green for full, amber for partial, remaining gray)
- **Review panel search**: Update placeholder to "Search by ASIN, SKU, or title..."
- **Scanned list**: Zebra striping, slightly larger row height for touch friendliness

## Files Modified
- `src/hooks/useStockAudit.ts` — expand `resolveBarcode` to match SKU and serial numbers
- `src/components/stock-audit/AuditScanner.tsx` — prominent scan result, row highlighting, qty UX, search placeholder
- `src/components/stock-audit/AuditReviewPanel.tsx` — search placeholder update

