

## Collapsible Metrics + Dual Search (SKU + Title)

### 1. Collapsible Metrics Header on Mobile

Wrap the `PurchaseSummaryHeader` component in a `Collapsible` that defaults to **closed** on mobile. Show a compact one-line summary (title + completion %) with a toggle chevron. The full metrics (ring, stat cards, progress bar) expand on tap. On desktop it stays open by default.

**File: `src/pages/PurchaseLink.tsx`**
- Add `metricsOpen` state, defaulting to `false`
- Wrap `<PurchaseSummaryHeader>` in `<Collapsible>` with a compact trigger bar showing title and completion %
- The trigger bar shows: title (truncated), completion badge (e.g. "6%"), and a chevron

### 2. Separate Search Bar from Filters

Move the search bar **outside** the collapsible filter section so it is always visible in the sticky header area. The filters (status buttons, sort) remain inside the collapsible.

**File: `src/pages/PurchaseLink.tsx`**
- Move the search `Input` out of `<CollapsibleContent>` and place it in the always-visible part of the sticky bar, above the collapsible trigger
- The collapsible now only contains filter buttons and sort buttons

### 3. Dual Search: SKU Search + Title Search (Cascading Filter)

Replace the single search bar with two compact inputs side by side:

- **First input**: "Search by SKU/ASIN..." -- filters the dataset to only items matching that SKU/ASIN
- **Second input**: "Search by title..." -- further filters within the SKU-matched results by title keywords

This creates a cascading/narrowing search: type a partial SKU to find all products from that SKU family, then type title keywords to pinpoint the exact item within that set.

**How it works technically:**

- Add `skuSearchTerm` and `titleSearchTerm` states (replacing the single `searchTerm`)
- Add debounced versions of both (200ms)
- Create two separate Fuse.js indexes:
  - `skuFuse`: searches on `asin`, `skuCode`, `poNumbers` keys
  - `titleFuse`: searches on `title` key only
- In `filteredGroups` useMemo:
  1. Start with all groups matching `filterStatus`
  2. If `debouncedSkuSearch` is non-empty, filter using `skuFuse`
  3. If `debouncedTitleSearch` is non-empty, further filter the result using a secondary Fuse search on just those items' titles
- Both inputs are always visible in the sticky bar, stacked vertically on mobile, side by side on desktop

**File: `src/pages/PurchaseLink.tsx`**

### Technical Details

**States to add:**
- `metricsOpen: boolean` (default `false`)
- `skuSearchTerm: string` and `titleSearchTerm: string` (replace single `searchTerm`)
- `debouncedSkuSearch` and `debouncedTitleSearch` (200ms debounce each)

**States to remove:**
- `searchTerm` and `debouncedSearch` (replaced by the two new pairs)

**useMemo changes:**
- Replace single `fuseIndex` with two: `skuFuse` (keys: `asin`, `skuCode`, `poNumbers`) and `titleFuse` (keys: `title`)
- Update `filteredGroups` to apply cascading filter: status -> SKU match -> title match

**UI layout in sticky bar:**
```text
+--------------------------------------------------+
| [SKU/ASIN search]    [Title search]              |
| [Filter: Pending v] [2,355 items] [Export]       |
|   (collapsible: filter buttons + sort buttons)   |
+--------------------------------------------------+
```

**Files to modify:**
- `src/pages/PurchaseLink.tsx` -- Collapsible metrics, dual search, restructured sticky bar
- `src/components/purchase-link/PurchaseSummaryHeader.tsx` -- Export `completionPercentage` or add a compact mode prop for the collapsed trigger display

