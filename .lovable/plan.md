

## Plan: Fix Dual-Sort Functionality and Improve UI for Stock Column

### Root Cause

The `handleSort` function (line 475) has a type signature that only accepts `keyof POOrder | 'combined_title'`. The buttons pass `'serial_number_qty'` and `'instock_qty'` using `as any`, which works at runtime for setting state but creates a type mismatch that can cause subtle issues with the equality check `sortField === field` when TypeScript narrows types during compilation. Additionally, the Qty sort button's visual feedback may not render because the active state comparison gets optimized away.

### Changes

**1. Fix `handleSort` type signature** (line 475)

Update the function signature to explicitly include all sort field types:

```typescript
const handleSort = (field: keyof POOrder | 'combined_title' | 'instock_qty' | 'serial_number_qty') => {
```

This matches the `sortField` state type at line 134 and removes the need for `as any` casts.

**2. Remove `as any` casts from sort buttons** (lines 6008, 6021)

Change the button onClick handlers to pass the sort field directly without `as any`:
- `handleSort('serial_number_qty' as any)` becomes `handleSort('serial_number_qty')`
- `handleSort('instock_qty' as any)` becomes `handleSort('instock_qty')`

**3. Improve the dual-sort button UI** (lines 6006-6032)

Replace the current cramped inline buttons with a cleaner segmented control:
- Slightly larger touch targets: `px-2.5 py-1.5` instead of `px-2 py-1`
- Text size bumped from `text-[10px]` to `text-xs`
- Clearer active state: `bg-primary/20 text-primary ring-1 ring-primary/30` for the active sort button
- Rounded ends on the segmented group: `rounded-l-md` and `rounded-r-md`
- Proper `cursor-pointer` on each button

### Files Modified

1. `src/components/POTracker.tsx` -- 3 edits:
   - Line 475: Widen `handleSort` type signature
   - Lines 6006-6032: Improve button UI and remove `as any` casts

### What Stays the Same

- All sorting logic in the `filteredAndSortedOrders` useMemo (lines 2116-2131) is correct and unchanged
- State type at line 134 already includes both fields
- No functional changes to any other sort behavior

