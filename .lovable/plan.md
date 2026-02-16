
## Fix Scanned Barcode Search + Add Visible Printer/Template Selection

### Problem 1: Alphanumeric Barcodes Not Found

Barcodes like `PG43301298304S` contain letters, so the search system classifies them as "SKU" instead of "barcode." The `product_barcodes` lookup only runs when the search type is detected as "barcode" (pure digits only). This means any scanned barcode with letters is never checked against the `product_barcodes` table.

**Fix**: Always check the `product_barcodes` table for ANY search term, regardless of detected type. If a match is found, use the linked ASIN/SKU to search PO orders. This is a simple, reliable approach -- if the barcode exists in the table, use it.

### Problem 2: Printer & Template Selection Not Easily Accessible

Currently, printer selection and label template selection are hidden inside the Print Settings sheet and only appear when "Auto-print" is toggled on. The user wants these options more visible.

**Fix**: Move the printer selection dropdown and label template dropdowns out of the settings sheet and display them directly on the search card area as compact selectors, visible at all times (not just when auto-print is on).

---

### Technical Changes

#### File: `src/components/stock-receiving/ItemSearchBar.tsx`

1. **Remove the `searchType === 'barcode'` gate** on the `product_barcodes` lookup (~line 250). Instead, always query `product_barcodes` for the search term:
   - Query with `barcode.eq` for exact match first
   - Also query with `asin.eq` or `sku_code.eq` as fallbacks
   - If a match is found, resolve the linked ASIN/SKU and set `resolvedBarcode`
   - This ensures `PG43301298304S` and similar alphanumeric barcodes are found

#### File: `src/pages/ReceiveStock.tsx`

2. **Add visible printer and template selectors** below the search bar area:
   - Show a compact row with printer dropdown, PO template dropdown, and inventory template dropdown
   - These are always visible (not gated behind auto-print toggle)
   - Keep the detailed settings (darkness, direct printing toggle) in the settings sheet

| File | Change |
|------|--------|
| `src/components/stock-receiving/ItemSearchBar.tsx` | Always query `product_barcodes` for any search term, not just numeric ones |
| `src/pages/ReceiveStock.tsx` | Move printer + template selectors to be visible below the search bar |
