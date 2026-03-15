

# Consolidate 12 Monthly Columns into Single Calendar Cell

## Current State
The dashboard renders 12 separate `<TableCell>` columns for each month — making the table very wide horizontally.

## Proposed Change
Replace all 12 individual month columns with a **single "Monthly Shipped (12mo)" column** containing an inline mini-calendar grid inside each cell:

```text
┌─────────────────────────────────────┐
│  Jan  Feb  Mar │ Apr  May  Jun │    │
│   10    5    9 │  10   20   30 │    │
│  Jul  Aug  Sep │ Oct  Nov  Dec │    │
│   20    5   10 │  50   20   50 │    │
└─────────────────────────────────────┘
```

- A compact 6-column grid (6 months per row, 2 rows) inside one `<TableCell>`
- Month labels as tiny headers (`text-[9px]`)
- Quantities displayed below each month in monospace
- A subtle vertical separator after every 3rd column to visually group quarters
- Zero quantities shown in muted color
- The last 3 months (recent period) slightly highlighted with a background tint to distinguish from prior period

## Files Modified
- `src/components/asin-sales-health/SalesHealthDashboard.tsx` — Remove the 12 `<TableHead>`/`<TableCell>` columns, replace with a single column containing the inline grid. Remove `last12Months` map from header/body, add a `MonthlyGrid` inline render per row.

