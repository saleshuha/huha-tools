

## Plan: Lock Filtered Results During Active Filters

### Problem
When any column filter is active (Print Status, Source, Fulfillment, In Stock, Barcode), performing actions like "Fulfill from Stock" or "Mark as Printed" causes the underlying data to change, which re-triggers the filter logic and removes items from view mid-workflow.

### Solution
Implement a **snapshot lock** mechanism: when any non-default filter is active, capture the set of order IDs that matched on first filter application. Subsequent re-renders will use this locked ID set instead of re-evaluating filter predicates, so rows stay visible even after their data changes. The lock clears when all filters return to defaults.

### Changes

**File: `src/components/POTracker.tsx`**

1. **Add a `lockedFilterIdsRef`** (useRef) to store the set of order IDs that matched when filters were first applied — placed near `stableLabelsOrderRef` (~line 2605)

2. **Add a helper** `hasActiveFilters()` that returns true if any of `printedFilter`, `sourceFilter`, `fulfillmentFilter`, `instockFilter`, or `barcodeFilter` are non-default

3. **Modify the inline filtering block** (~lines 6179-6261): After all `.filter()` chains produce `ordersForSelectedPOs`, add logic:
   - If filters are active AND `lockedFilterIdsRef` is empty → snapshot current result IDs into the ref
   - If filters are active AND `lockedFilterIdsRef` has IDs → instead of running filter chains, use the locked IDs to filter from the full (unfiltered) PO list for the selected POs
   - If no filters are active → clear the locked ref

4. **Add a visual indicator** — a small "Locked" badge near the filter area showing results are frozen, with a "Clear & Refresh" button that resets all filters and clears the lock

5. **Clear the lock** when filters change — track filter values in a ref, and if the filter *combination* changes (not the data), reset the lock so the new filter runs fresh

### Technical Detail

```text
lockedFilterIdsRef = useRef<Set<string> | null>(null)
prevFilterValuesRef = useRef<string>('')

On each render in the labels table:
  filterKey = JSON.stringify({printedFilter, sourceFilter, fulfillmentFilter, instockFilter, barcodeFilter})
  filtersActive = hasActiveFilters()
  filterValuesChanged = filterKey !== prevFilterValuesRef.current

  if (!filtersActive) {
    lockedFilterIdsRef.current = null      // no filters → no lock
  } else if (filterValuesChanged) {
    lockedFilterIdsRef.current = null      // filter changed → re-evaluate
    prevFilterValuesRef.current = filterKey
  }

  // Run normal filter chain...
  ordersForSelectedPOs = [... filtered results ...]

  if (filtersActive && !lockedFilterIdsRef.current) {
    // First run with these filters → snapshot
    lockedFilterIdsRef.current = new Set(ordersForSelectedPOs.map(o => o.id))
    // Also store consolidated sub-order IDs
  }

  if (filtersActive && lockedFilterIdsRef.current) {
    // Use locked IDs: take all orders for selected POs, keep only those in the lock set
    ordersForSelectedPOs = allOrdersForSelectedPOs.filter(
      o => lockedFilterIdsRef.current.has(o.id)
    )
  }
```

This ensures rows never vanish during a workflow session. Only changing the filter selection or clearing filters refreshes the visible set.

### Files Modified
- `src/components/POTracker.tsx` — add lock refs, modify filter block, add lock indicator UI

