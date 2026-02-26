

## Plan: Standardize PO Tracker Sub-Tab UI to Match Market Purchases Design Pattern

### Summary
Create reusable UI components extracted from the Market Purchases design pattern, then apply them across all PO Tracker tab contents. No functional or logic changes -- purely visual consistency.

### What Gets Created (Reusable Components)

**1. `src/components/ui/compact-stat-bar.tsx`** -- Universal stat bar component
- Renders a horizontal row of stat items in `p-2.5 rounded-xl bg-card border border-border` container
- Each item: icon + label + value in `px-3 py-1.5 rounded-lg bg-muted/50`
- Supports a highlighted "total" item with `bg-primary/10`
- Replaces the current 9-card metrics grid in Overview tab with a compact inline version

```text
┌──────────────────────────────────────────────────────────────────┐
│ 📦 POs 14  │  📋 Items 1136  │  📊 In Stock 238  │  ... │ Total 2411 │
└──────────────────────────────────────────────────────────────────┘
```

**2. `src/components/ui/toolbar-bar.tsx`** -- Universal toolbar wrapper
- Consistent `flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border` container
- Used for search bars, filter buttons, action buttons across all tabs
- Provides slot-based composition (left content, spacer, right content)

**3. `src/components/ui/data-table.tsx`** -- Universal table wrapper component
- Wraps native `<table>` with `border border-border rounded-xl overflow-hidden bg-card`
- Standard header: `bg-muted/40 border-b border-border` with `text-xs uppercase tracking-wider text-muted-foreground`
- Zebra striping: alternating `bg-muted/10` rows
- Hover: `hover:bg-muted/20 transition-colors`
- Matches the Market Purchases table pattern exactly

### What Gets Updated (Tab Content Styling)

**Tab 1: Overview** (lines ~3605-4222)
- Replace the 9-card `POMetricsCard` grid with the new `CompactStatBar` -- same data, compact horizontal layout
- Keep the clickable filter behavior (onClick still sets `selectedMetricFilter`)
- Wrap search + action buttons in `ToolbarBar`
- Restyle the grouped/detailed tables using `DataTable` wrapper conventions: consistent header classes, zebra striping, rounded corners
- Restyle pagination to match: compact `flex items-center justify-between` with muted text

**Tab 2: Uploads** (lines ~4224-4328)
- Wrap the card header actions in a `ToolbarBar` for "Load All POs" and "Delete Today's Uploads" buttons
- Standardize button styling: `h-8 text-xs gap-1.5` pattern with rounded-lg

**Tab 3: Print Labels** (lines ~4330-7241)
- Already fairly well-styled; minor alignment:
  - Standardize the PO selection table header to use `bg-muted/40` + uppercase tracking pattern
  - Wrap search/location controls in `ToolbarBar`

**Tab 4: Profit Analyzer** -- delegates to `<ProductProfitAnalyzer />`, minimal changes needed

**Tab 5: Shipped Orders** (ShippedOrdersUpload.tsx)
- Add `CompactStatBar` at top showing Total Items, Total Qty, Last Modified
- Wrap search + actions in `ToolbarBar`
- Restyle the data table with `DataTable` conventions (zebra rows, rounded border, uppercase headers)
- Add mobile card layout (md:hidden) matching Market Purchases responsive pattern

**Tab 6: FBA Inventory** (FBAInventoryUpload.tsx)
- Same treatment as Shipped Orders: stat bar, toolbar, standardized table

**Tab 7: Purchase Links** -- delegates to `<PurchaseLinkManagement />`, already has its own styling

### Design Pattern Reference (from Market Purchases)

```text
┌─ Compact Stat Bar ──────────────────────────────────────────────┐
│ [icon] Label  Value  │  [icon] Label  Value  │  ... │  Total   │
└─────────────────────────────────────────────────────────────────┘

┌─ Toolbar Bar ───────────────────────────────────────────────────┐
│ 🔍 Search input     │  Filters  │  Refresh  │        N entries │
└─────────────────────────────────────────────────────────────────┘

┌─ Data Table ────────────────────────────────────────────────────┐
│  IMAGE │ PRODUCT │ QTY │ STATUS │ ACTIONS                      │  ← uppercase, muted
├────────┼─────────┼─────┼────────┼──────────────────────────────┤
│  ...   │  ...    │ ... │  ...   │  ...                         │  ← white
│  ...   │  ...    │ ... │  ...   │  ...                         │  ← bg-muted/10
│  ...   │  ...    │ ... │  ...   │  ...                         │  ← white
└────────┴─────────┴─────┴────────┴──────────────────────────────┘
```

### Files to Create
1. `src/components/ui/compact-stat-bar.tsx`
2. `src/components/ui/toolbar-bar.tsx`
3. `src/components/ui/data-table-wrapper.tsx`

### Files to Modify
1. `src/components/POTracker.tsx` -- Overview tab: swap metrics grid for stat bar, standardize tables/toolbar
2. `src/components/po/ShippedOrdersUpload.tsx` -- Add stat bar, toolbar, standardized table + mobile cards
3. `src/components/po/FBAInventoryUpload.tsx` -- Same treatment as Shipped Orders

### What Stays the Same
- All data fetching, hooks, state management
- All button click handlers and business logic
- All dialog/modal content
- Print Labels tab detailed print flow
- Profit Analyzer component internals
- Purchase Links component internals
- POMetricsCard component file (kept for potential reuse elsewhere, just not rendered in Overview)

