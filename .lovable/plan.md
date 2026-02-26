
### Objective
Fix the Labels tab Stock column so both sort controls work reliably:
1) S/N sort (asc/desc)  
2) In-stock Qty sort (asc/desc)  
and improve the header UI so the Qty sort control is always visible.

### What I found in the codebase
- The Stock header buttons are wired to `handleSort('serial_number_qty')` and `handleSort('instock_qty')` in `src/components/POTracker.tsx` (around lines 6006–6032).
- The table currently shown on `/po-tracker?tab=labels` (print step) is **not** sorted by the earlier global `filteredAndSortedOrders` block.
- Instead, Labels print-step rows are sorted in a **separate local sorter** at `ordersToDisplay.sort(...)` (around lines 6360+).
- That local sorter does **not** implement special cases for:
  - `'instock_qty'`
  - `'serial_number_qty'`
- Because of that, those fields fall through to `a[sortField] / b[sortField]`, which are undefined for these synthetic sort keys, so row order does not actually change.
- Additional UI issue: Stock header column width is tight (`min-w-[160px]` with `table-fixed` layout), so the segmented controls can be clipped, which explains “Qty sorting is not showing”.

### Root cause
Two separate issues:
1) **Logic mismatch**: Labels table sorting path is missing handlers for the two synthetic stock sort fields.  
2) **Header layout constraint**: Stock header width/layout can hide or clip the Qty segment in some viewport/table width combinations.

---

### Implementation plan

#### 1) Unify sort field typing to avoid drift
In `POTracker.tsx`, define and reuse one `SortField` type:
- `keyof POOrder | 'combined_title' | 'instock_qty' | 'scanned_barcode' | 'serial_number_qty'`

Apply it to:
- `sortField` state type
- `handleSort` parameter type
- any local sorter branches that switch on sort keys

This removes fragile `as any` patterns and keeps all sort paths consistent.

#### 2) Add shared stock sort value helper(s)
Create helper(s) in `POTracker.tsx` used by both sorting blocks:
- `getInStockQtyForSort(order)`  
  - Uses existing `findInventoryMatch(...)`
  - Returns numeric qty aligned with what Stock cell represents (0 when not in-stock/closed cases as needed)
- `getSerialForSort(order)`  
  - Handles both match shapes:
    - ASIN path: `serialNumbers[]`
    - SKU path: `serialNumber` / `inventoryItem.serial_number`
  - Produces a deterministic comparable string (normalized, case-insensitive, numeric-aware compare support)

This prevents divergence between “global” and “labels” sort behavior.

#### 3) Fix Labels print-step sorter (critical fix)
In the `ordersToDisplay.sort(...)` block (lines ~6360+), add explicit branches:
- `sortField === 'instock_qty'` → compare `getInStockQtyForSort(a/b)`
- `sortField === 'serial_number_qty'` → compare `getSerialForSort(a/b)` with `localeCompare(..., { numeric: true, sensitivity: 'base' })`

Keep existing direction toggle behavior (`asc`/`desc`) and stable tie-breaker logic.

#### 4) Keep global sorter aligned
In the earlier sorter (`filteredAndSortedOrders`, lines ~2108+), switch serial/qty comparisons to the same helper(s) so both tabs behave consistently and future regressions are less likely.

#### 5) Improve Stock header UI so Qty is always visible
Update Stock header structure/classes (same file):
- Increase column sizing from `min-w-[160px]` to a stable width such as `w-[220px] min-w-[220px]`.
- Use a non-clipping layout:
  - label section + segmented control with `shrink-0`
  - ensure both segments render at all times
- Keep active-state visuals but tighten spacing for reliability.
- Add clearer disabled UX when `originalOrderPreserved` is true (e.g., disabled styling/tooltip text indicating to use “Enable Sorting”).

#### 6) Regression check for original-order mode
Ensure existing “preserve order while printing” behavior remains intact:
- When preserved mode is ON, sort controls should be visibly disabled and explain why.
- When user enables sorting, both S/N and Qty work immediately.

---

### Files to modify
- `src/components/POTracker.tsx`
  - sort field typing consolidation
  - shared stock sort helper(s)
  - labels sort block fixes
  - global sort alignment
  - stock header width/layout update

---

### Validation checklist (end-to-end)
1) Go to `/po-tracker?tab=labels`, enter print-step table.
2) Click **S/N**:
   - row order changes
   - icon state toggles asc/desc on repeat click
3) Click **Qty**:
   - row order changes by in-stock quantity
   - icon state toggles asc/desc on repeat click
4) Confirm **Qty segment is visible** at common desktop widths (including ~1336px).
5) Test both consolidated modes (merged/detailed) if available.
6) Verify no regressions for other sort columns (SKU, PO Qty, Scanned Barcode).
7) Verify preserved-order mode still prevents reordering until explicitly enabled.

---

### Technical details
- The key bug is not in the button handler; it is in the Labels-specific sort pipeline (`ordersToDisplay.sort`) that ignored synthetic fields.
- `findInventoryMatch` returns different shapes depending on ASIN/SKU matches; serial sorting must read both `serialNumbers[]` and `serialNumber`.
- With `table-fixed`, `min-w` alone is not always enough for complex header controls; explicit width + `shrink-0` segmented group is the reliable fix.
