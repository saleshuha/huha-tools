

## Inventory Table — Sorting & Pagination Fixes

### Issues Found

1. **Sorting crashes for 3 sort fields**: The `useAsinInventoryPaginated` hook maps `sortBy` values to Supabase column names but only handles `dateAdded` → `date_added` and `serialNumber` → `serial_number`. The values `restock`, `exportMode`, and `performance` are passed directly as column names to `query.order()`, but these columns don't exist in `asin_inventory`. This causes a Supabase error (400) and breaks the query entirely.

2. **Sort mapping incomplete for valid fields**: `quantity`, `asin`, `status`, `title` happen to match DB column names and work by luck, but `restock` should map to `eligible_for_restock`.

3. **`exportMode` and `performance` can't be sorted server-side**: `exportMode` is stored in a separate `export_mode_preferences` table, and `performance` is computed client-side from `useComprehensivePerformance`. These need to fall back to a default sort (e.g. `date_added`) at the DB level, with optional client-side re-sorting of the current page.

4. **`performanceFilter` not applied**: The `performanceFilter` state is passed to `QuickControlsBar` UI but never used in the paginated query or any filtering logic.

### Plan

#### File: `src/hooks/useAsinInventoryPaginated.ts`

**Fix sort field mapping** (lines 143-148):
- `restock` → `eligible_for_restock`
- `exportMode` → fall back to `date_added` (can't sort server-side)
- `performance` → fall back to `date_added` (can't sort server-side)
- `quantity` → `quantity` (already works, but make explicit)
- `title` → `title` (already works, but make explicit)
- `asin` → `asin` (already works, but make explicit)
- `status` → `status` (already works, but make explicit)

```typescript
const sortFieldMap: Record<string, string> = {
  dateAdded: 'date_added',
  serialNumber: 'serial_number',
  restock: 'eligible_for_restock',
  exportMode: 'date_added',  // no DB column — fallback
  performance: 'date_added', // computed client-side — fallback
  asin: 'asin',
  quantity: 'quantity',
  status: 'status',
  title: 'title',
};
const sortField = sortFieldMap[filters.sortBy || 'dateAdded'] || 'date_added';
```

#### File: `src/components/AsinInventory.tsx`

**Add client-side re-sort for `exportMode` and `performance`**: After receiving `inventory` from the paginated hook, if `sortBy` is `exportMode` or `performance`, apply a `useMemo` sort on the current page's items using the `exportModes` map or `performanceMap` respectively. This gives correct per-page ordering even though the DB can't sort these fields globally.

**Apply `performanceFilter`**: If `performanceFilter !== 'all'`, filter the `inventory` array client-side using `performanceMap` data before rendering. This is already partly set up in `QuickControlsBar` but never wired through.

### Files Modified
- `src/hooks/useAsinInventoryPaginated.ts` — Fix sort field mapping
- `src/components/AsinInventory.tsx` — Client-side re-sort for exportMode/performance, wire performanceFilter

