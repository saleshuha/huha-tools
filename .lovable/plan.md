

## Performance Column - Show Key Metrics Directly in Cell

### What Changes

Replace the current category + score + bar layout with a **4-row stats layout** showing the metrics you want directly in the column cell:

```text
+----------------------------+
| Restocked:  120            |
| Sold:       95             |
| In Stock:   45d            |
| Last Sold:  3d ago         |
+----------------------------+
```

Each row is a label + value pair, compact and readable. The category color is applied as a left border accent so you still get the visual health signal.

### Data Mapping

All 4 values come from the existing `performanceData` object:

| Display Label   | Source Field                | Format        |
|-----------------|----------------------------|---------------|
| Restocked       | `total_units_restocked`    | number        |
| Sold            | `total_units_sold_lifetime`| number        |
| In Stock        | `days_in_inventory`        | Xd            |
| Last Sold       | `avg_days_to_sellout`      | Xd ago (or --)|

**Note**: The data object doesn't have a literal "days since last sold" field. The closest available metric is `avg_days_to_sellout` (average days it takes to sell out after restock). If you need the actual "last sold date", that would require a database change. For now, I'll use `avg_days_to_sellout` labeled as "Avg Sellout" instead of "Last Sold" to stay accurate.

### Technical Changes

**File: `src/components/inventory/PerformanceIndicator.tsx`**

- Replace `PerformanceCell` with a new 4-row metric grid
- Add a colored left border (2px) using the category color for quick health signal
- Keep the category name as a small header above the stats
- Keep the existing tooltip with full details on hover
- Legacy fallback shows dashes for missing data

### Visual Design

- Left border accent in category color (emerald/blue/amber/red)
- Small category label at top in category color
- 4 rows of label:value pairs in `text-[11px]`, labels muted, values bold
- Min width ~110px to fit content
- Tooltip unchanged - still shows the full breakdown on hover
