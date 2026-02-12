

## Simplify Item Actions + Performance Improvements

### 1. Replace Quantity Input with Two Simple Actions

Remove the quantity input box and Save button from each card. Replace with two clear action buttons:

- **"Scan Barcode (Mark as Done)"** -- Opens the barcode scanner; on successful scan, automatically marks the item as purchased (sets purchased_quantity = totalRequired) and links the barcode
- **"Not Available"** -- Marks the item as not available (same as current N/A behavior)

This simplifies vendor workflow from "type qty, click save" to a single tap.

**File: `src/pages/PurchaseLink.tsx`**
- Remove the `Input` for quantity and the Save `Button` from the actions row (lines 728-749)
- Replace with a wider "Scan (Done)" button that opens the scanner AND auto-marks as purchased on successful scan
- Keep the "N/A" button as-is
- Update `handleBarcodeScanned` to also call `handleSaveGroup` with full required quantity after linking the barcode
- Keep the `handleSaveGroup` function intact internally for bulk actions and barcode-triggered saves

### 2. Collapsible Header/Filter UI (Always Closed)

Wrap the search bar, filter buttons, and sort controls inside a `Collapsible` component that defaults to closed. Show a compact summary bar with the current filter name and a toggle button.

**File: `src/pages/PurchaseLink.tsx`**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from the existing UI components
- Add a `filterOpen` state, defaulting to `false`
- Show a thin bar with current filter label, item count, and a chevron toggle
- Put the search input, filter buttons, and sort buttons inside `CollapsibleContent`

### 3. Performance Improvements

**Faster search/filtering for large datasets:**
- Use `Fuse.js` (already installed) for fuzzy search indexing instead of repeated `.includes()` calls on every keystroke
- Add a 200ms debounce to the search input so filtering doesn't run on every character
- Pre-build an update lookup `Map<string, Update>` (keyed by `po_order_id`) in `useMemo` to replace repeated `.find()` calls in `getGroupStatus` and grouping logic -- this turns O(n*m) lookups into O(1)

**Faster rendering:**
- Virtualize the item list using `@tanstack/react-virtual` (already installed) so only visible cards are rendered instead of all 2,500+
- Memoize `getGroupStatus` results inside the `filteredGroups` useMemo to avoid recalculating per-render

### Technical Details

**File: `src/pages/PurchaseLink.tsx`**

1. Add `updatesMap` useMemo that builds `Map<po_order_id, update>` from `data.updates`
2. Refactor `groupedOrders` and `getGroupStatus` to use `updatesMap.get()` instead of `.find()`
3. Add Fuse.js index on grouped orders (keys: title, asin, skuCode, poNumbers)
4. Add debounced search term state (200ms delay)
5. Replace the items list `div` with a virtualized container using `useVirtualizer`
6. Wrap filter section in `Collapsible` defaulting to closed
7. Replace qty input + save button with "Scan (Done)" and "N/A" buttons
8. Update `handleBarcodeScanned` to auto-save full required quantity after barcode link

All existing functions (bulk actions, undo, export, supplier details, realtime sync) remain intact.

