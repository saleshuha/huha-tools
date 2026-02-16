

## Add Scanned Barcode Search to Stock Receiving Search Bar

### What Changes

When you search or scan a barcode in the stock receiving search bar, the system will look up that barcode in the `product_barcodes` table (where barcodes scanned via Purchase Link are stored). If a match is found, it will use the linked ASIN/SKU to find the corresponding PO orders and display them with priority information -- exactly like searching by ASIN directly.

### How It Works

1. When a search term is detected as a "barcode" type (numeric, 8-14 digits), the system will first query the `product_barcodes` table for a match.
2. If a matching barcode record is found (with a linked ASIN or SKU), it will use that ASIN/SKU to search PO orders and inventory -- producing the same priority-sorted results as a direct ASIN search.
3. The result cards will show a small "Scanned Barcode" badge so you can see the barcode was resolved from a scan.
4. If no barcode match is found in `product_barcodes`, it falls back to the existing search behavior.

### Technical Details

#### File: `src/components/stock-receiving/ItemSearchBar.tsx`

**In the `searchItems` function (~line 233):**

- After detecting the search type, if the type is `barcode`, query the `product_barcodes` table:
  ```
  SELECT * FROM product_barcodes WHERE barcode = <search_term> LIMIT 1
  ```
- If a match is found, extract the linked `asin` or `sku_code` from the barcode record and use it as the effective search term for the existing PO orders and inventory queries.
- Pass the original barcode value through so the UI can display it.

**In the search results display:**

- Add a small badge on matched results showing the resolved barcode value (e.g., "Barcode: 8901234567890") so the user knows the item was found via barcode lookup.

**Also extend barcode detection:**

- Update the `detectSearchType` function to also match longer barcode formats (UPC/EAN patterns) that may not be purely 8-14 digits but are still valid scanned barcodes.

| File | Change |
|------|--------|
| `src/components/stock-receiving/ItemSearchBar.tsx` | Add barcode lookup in `searchItems`, update result display |

