

## Add "Last Sold" Date to Performance Column

### What Changes

Add a 5th metric row to the performance cell showing the date the product last sold a unit:

```text
+----------------------------+
| Excellent                  |
| Restocked:  120            |
| Sold:       95             |
| In Stock:   45d            |
| Avg Sellout: 38d           |
| Last Sold:  Jan 15, 2026   |  <-- NEW
+----------------------------+
```

### Data Source

The `last_sale_date` field already exists in:
- The database function `get_comprehensive_performance_analysis` (line 14, 44, 97)
- The hook `useComprehensivePerformance.ts` (line 14)
- The `performanceMap` data available in `AsinInventory.tsx`

It's just not being passed to the `PerformanceIndicator` component yet.

### Technical Changes

**File 1: `src/components/inventory/PerformanceIndicator.tsx`**
- Add `last_sale_date: string | null` to the `performanceData` interface
- Add a new `MetricRow` displaying the formatted date (e.g., "Jan 15, 2026") or a dash if null
- Show in tooltip as well

**File 2: `src/components/AsinInventory.tsx`**
- Pass `last_sale_date: perfData.last_sale_date` in the `performanceData` prop (line ~2049)

No database changes needed -- the data is already being returned.
