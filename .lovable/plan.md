

## Plan: Advanced Stock Ledger UI Overhaul

### Changes

#### 1. Redesign `StockHistoryDialog.tsx` — Enhanced layout with tabs and chart
- Add a **Tabs** component with two views: "Ledger" (table) and "Analytics" (charts from existing `StockHistoryChart`)
- Redesign summary bar into a **CompactStatBar**-style horizontal pill row with 5 metrics: Current Stock, Total In, Total Out, Net Change, Entry Count — each with colored icons
- Add a **Previous Qty → New Qty** column to the table header
- Add sticky table header with `DataTableWrapper` conventions (uppercase, tracking-wider)
- Show row count footer with "Showing X of Y entries"

#### 2. Redesign `StockLedgerRow.tsx` — Richer table rows
- Add **Prev → New** column showing `previous_quantity → new_quantity` with percentage change badge
- Add colored left-border indicator on each row (green for increase, red for decrease, gray for zero)
- Improve expanded details panel: use a card-style layout with dividers instead of plain grid
- Add relative time ("2h ago") next to the absolute date
- Show user avatar placeholder (initials circle) instead of plain text
- Zebra-stripe rows using `dataTableRowClass`

#### 3. Minor polish across components
- `StockHistoryFilters.tsx`: No changes needed (already recently redesigned)
- `StockHistoryExport.tsx`: No changes needed

### Files Modified
1. `src/components/StockHistoryDialog.tsx` — Tabs, stat bar, chart integration, footer
2. `src/components/stock-history/StockLedgerRow.tsx` — Enhanced row with prev→new, avatars, borders, zebra stripes

