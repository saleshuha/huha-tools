## Goal
Make Shipped Orders and FBA Inventory uploads support multiple files without erasing prior data, and add per-file management so users can review, replace, or delete each upload independently.

## Current behavior (the bug)
- `saveFBAInventory` / `saveShippedOrders` run `DELETE WHERE user_id` before each insert → uploading file #2 wipes file #1.
- Dropzones use `multiple: false`, so users can only pick one file at a time.
- UI only displays a single "File" name in the stat bar. Quantity aggregation across ASINs already works in the hooks (Map sums by ASIN), so once multi-file persistence is fixed, totals across files will combine automatically.

## Changes

### 1. Storage layer (append + per-file ops)
`src/utils/fbaInventoryStorage.ts` and `src/utils/shippedOrdersStorage.ts`:
- Replace destructive `save…` with `appendFBAInventory(items, fileName)` / `appendShippedOrders(items, fileName)` — inserts only, no pre-delete. If `fileName` already exists for that user, delete only that file's rows first (replace-by-filename), so re-uploading the same file refreshes instead of duplicating.
- Add `listFBAFiles()` / `listShippedFiles()` returning `{ fileName, itemCount, totalQuantity, lastModified }[]` grouped by `file_name`.
- Add `deleteFBAByFile(fileName)` / `deleteShippedByFile(fileName)`.
- Keep `clearFBAInventory` / `clearShippedOrders` for the "Clear All" action.
- `loadFBAInventory` / `loadShippedOrders`: keep returning the merged item list (already correct via pagination); drop the misleading single `fileName` field — replaced by the file list.

### 2. Hooks
`src/hooks/useFBAInventory.ts` and `src/hooks/useShippedOrders.ts`:
- Expose `files` (the per-file summary list), `append(items, fileName)`, `deleteFile(fileName)`, plus existing `clear`, `reload`, `getFBAQty` / `getShippedQty`, and quantity maps (aggregation already sums duplicates across files).
- Remove the single `fileName` field; add `filesCount`.

### 3. UI — `FBAInventoryUpload.tsx` and `ShippedOrdersUpload.tsx`
- Dropzone: `multiple: true`. Loop through `acceptedFiles` and parse each sequentially. If a file lacks auto-detected mapping, queue it and show the mapping dialog one file at a time.
- Replace the single "File" stat with **Files: N**. Keep SKUs / Total Units / Last Modified.
- Add a new **Uploaded Files** panel (collapsible card) above the data table listing each file with: file name, item count, total units, uploaded-at, and a small `Trash2` icon button per row to delete just that file (with confirm dialog). Re-uploading the same file replaces its rows.
- Keep "Clear All" button in toolbar for nuking everything.
- Show a small progress indicator while processing multiple files ("Processing 2 of 5…").

### 4. No DB schema change required
`fba_inventory` and `shipped_orders` already have `file_name` and `user_id`. The append + replace-by-filename + group-by-filename logic works on the existing tables.

## Out of scope
- No changes to ASIN lookup consumers (POTracker etc.) — they keep using `getFBAQty` / `getShippedQty`, which transparently aggregate across all files.
- No changes to print/sync flows.

## Files touched
- `src/utils/fbaInventoryStorage.ts` (edit)
- `src/utils/shippedOrdersStorage.ts` (edit)
- `src/hooks/useFBAInventory.ts` (edit)
- `src/hooks/useShippedOrders.ts` (edit)
- `src/components/po/FBAInventoryUpload.tsx` (edit)
- `src/components/po/ShippedOrdersUpload.tsx` (edit)
