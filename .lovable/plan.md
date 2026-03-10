

# Replenishment Page: Bug Fixes and UI Redesign

## Bugs Found

### Bug 1: Dead code in `removeRestockedOrderedItems`
Lines 1475-1483 create `asinUpdates` array but never execute it. Only `skuUpdates` (a duplicate copy) runs. The `asinUpdates` should be included in the `Promise.all`.

### Bug 2: Select All uses wrong filter
`pendingItems` is filtered by the legacy `searchTerm` state, but the Ready to Order tab displays items filtered by `readyToOrderSearch`. This means "Select All" can select items not visible on screen, and vice versa.

### Bug 3: Bulk action count mismatch
The "Order from Sunsky" and "Mark as Ordered" buttons reference `pendingItems` for building the order, which uses the legacy search filter. Should use `filteredReadyToOrder` to match what the user sees.

## UI Redesign Plan

The current page has inconsistent styling compared to the project's established design system (compact `h-8` controls, `text-xs` typography, `glass-container` surfaces, gradient headers). The redesign will align with the existing theme:

### 1. Calculation Status Card
- Already well-styled, keep as-is.

### 2. Config Selector Row
- Wrap in a `ToolbarBar`-style card with compact `h-8` controls and `text-xs` labels to match the project pattern.

### 3. Main Tabs (Restock Management / Daily Orders Queue)
- Replace the current large `h-14` tab triggers with compact `h-10` styled tabs matching the design system.
- Remove redundant nested card header ("Restock Management" title appears twice).

### 4. Inner Tabs (Ready to Order / Ordered / Out of Stock / Non-Source)
- Style with compact rounded tabs, remove hardcoded colors (`bg-blue-600`, `bg-destructive`, `bg-orange-600`) in favor of primary-based active states.
- Add subtle count badges with themed backgrounds.

### 5. Item Cards (`ReplenishmentItemCard`)
- Tighten padding from `p-4` to `p-3`.
- Use `text-xs` for all metrics, smaller image (`w-16 h-16`).
- Use themed icon colors (`text-primary`) consistently.
- Add subtle background gradient matching card patterns.

### 6. Search Bars and Bulk Actions
- Search bars: `h-8` height, `text-xs` placeholder.
- Bulk action bar: Compact layout with `h-8` buttons.

### 7. Summary Badges
- Use `CompactStatBar`-style pill badges for counts.

## Files to Edit
- `src/components/Replenishment.tsx` — Fix 3 bugs, update tab styling, remove redundant headers, align config row
- `src/components/replenishment/ReplenishmentItemCard.tsx` — Compact card layout, themed styling
- `src/components/replenishment/ReplenishmentSearchBar.tsx` — Compact `h-8` search input
- `src/pages/Replenishment.tsx` — Minor cleanup (already well-structured)

