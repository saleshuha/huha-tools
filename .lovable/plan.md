

## Fix Dual Search: Partial SKU + Title Combined Filtering

### Problem
The dual search on the Purchase Link page uses fuzzy matching (Fuse.js) for the SKU field, which returns inaccurate results. When you type a partial SKU like "VLBURAQ", it should find all items whose SKU **contains** that text (e.g., "VLBURAQTVR0085"), not fuzzy-approximate matches. Then the title field should further narrow those results.

### Solution
Replace the SKU search from fuzzy matching to **exact substring matching** (case-insensitive). This means typing "VLBURAQ" will only show items where the SKU, ASIN, or PO number actually contains that text. The title search will then further filter within those matched items.

### Changes to `src/pages/PurchaseLink.tsx`

1. **SKU/ASIN search (lines 450-458)**: Replace Fuse.js fuzzy search with a simple `.includes()` substring filter across `asin`, `skuCode`, and `poNumbers` fields. This ensures partial SKU input like "VLBURAQ" correctly matches "VLBURAQTVR0085".

2. **Title search (lines 460-468)**: Keep Fuse.js fuzzy matching but reduce the threshold from 0.3 to 0.4 for slightly more forgiving title matches, since it's already narrowed by SKU.

3. **Remove unused `skuFuse` memo (lines 437-443)**: Clean up the pre-built Fuse index that's no longer needed for SKU search.

### How it works after the fix

- Type "VLBURAQ" in SKU field --> shows all items where SKU/ASIN/PO contains "VLBURAQ"
- Then type a word in Title field --> further narrows to only items whose title matches
- Both filters work together (AND logic), so you get precisely the items you need

