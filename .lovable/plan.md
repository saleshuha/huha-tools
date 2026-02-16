

## Fix: Row Position Stability During Filtering and Pagination Scroll Behavior

### Problem 1: Rows change position when data changes (e.g., fulfilling from stock)

**Root Cause**: In the Labels tab, when you perform an action like "Fulfill from Stock," the underlying `poOrders` data changes. This triggers the entire filtering and sorting pipeline to recompute. The sort order may change because the item's properties (like `notes`, `printed_quantity`) have been modified, causing it to land in a different position.

**Solution**: Assign each row a stable sort index based on its original position when first rendered, and use that index as a tiebreaker in sorting. This ensures that when an item's data changes but the same filters are active, it stays in the same visual position.

- Add an `_originalIndex` property to each order when the `ordersToDisplay` array is first computed
- Store the previous order of item IDs in a `useRef`
- When re-sorting, use the stored index as a secondary sort key so items that are "equal" under the current sort retain their relative position
- Only reset the stored order when filters themselves change (not when data within rows changes)

### Problem 2: Pagination scrolls to table start instead of staying in place

**Root Cause**: When clicking Next/Previous page buttons, React re-renders the table content. The browser's default behavior scrolls to accommodate the new DOM, and no scroll-position management is in place for the Labels tab pagination.

**Solution**: Remove any automatic scroll-to-top behavior on page change and keep the user's current scroll position. The pagination controls are at the bottom of the table, so the user should stay at the bottom when navigating pages.

- Wrap the page change handlers to save and restore `scrollY` position after the state update
- Use `requestAnimationFrame` to restore scroll position after React renders the new page

### Technical Changes

**File: `src/components/POTracker.tsx`**

1. **Stable row ordering** (Labels tab):
   - Add a `useRef` to store the last known order of item IDs (e.g., `stableOrderRef = useRef<Map<string, number>>()`)
   - After `ordersToDisplay` is built and sorted, assign each item an `_originalIndex` based on its position
   - On subsequent renders (when only data changes, not filter changes), use the stored index map as the primary sort key
   - Reset the stored order map whenever filter state variables (`sourceFilter`, `fulfillmentFilter`, `instockFilter`, `printedFilter`, `barcodeFilter`, `searchTags`, `labelSearchQuery`) change

2. **Stable row ordering** (Overview tab):
   - Apply the same `_originalIndex` tiebreaker logic to the `filteredOrders` useMemo
   - The `preventTableReorder` flag already exists but needs to be activated properly when data mutations occur (e.g., after fulfill-from-stock operations, set it temporarily)

3. **Pagination scroll fix** (Labels tab):
   - Modify the `setLabelCurrentPage` calls in Next/Previous/page number buttons to wrap in a function that preserves scroll position using `window.scrollY` and `requestAnimationFrame(() => window.scrollTo(0, savedY))`

4. **Pagination scroll fix** (Overview tab):
   - Apply the same scroll-preservation logic to the `setCurrentPage` handlers

