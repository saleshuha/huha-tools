

## Advanced Amazon Returns Analysis Page - Redesign Plan

### Current Issues Identified

1. **Bug: Delete button missing from table rows** - The delete action column exists in the component but is not rendered in table rows (no delete button per row despite `handleDeleteClick` being defined)
2. **Bug: AI Insights uses `supabase.functions.invoke()`** - Same issue as the Replenishment page; will crash with the "region undefined" error
3. **Fixed 20 items per page** - No option to change page size
4. **Filter panel takes too much vertical space** - Search, quick filters, date range, slider all stacked vertically
5. **No summary row** showing filtered totals vs overall totals
6. **No impact_score column** displayed even though data exists
7. **Sort indicators are basic** - Uses generic ArrowUpDown buttons instead of the cleaner SortableTableHeader component used elsewhere
8. **Missing country filter** in filter panel (type supports it but UI doesn't show it)
9. **No file name filter** - Users upload from different files but can't filter by file

---

### Changes Overview

#### 1. Compact Inline Filter Bar (ReturnsFilterPanel.tsx)
Replace the tall stacked card with a single-row horizontal filter bar:
- Search input on the left
- Quick filter badges inline
- Collapsible "Advanced Filters" section for date range and ratio slider
- Active filter count badge
- Much less vertical space used by default

#### 2. Enhanced Data Table (ReturnsDataTable.tsx)
- **Add delete button** to each row (fix the missing action column bug)
- **Use SortableTableHeader** component for consistent, clean sort indicators
- **Add items-per-page selector** (20, 50, 100, All) matching the OrdersTable pattern
- **Add impact score column** - shows the impact_score value with color coding
- **Add row count summary** - "Showing 1-20 of 1,263 results" at bottom
- **Add file name display** in a tooltip on hover
- **Improve table density** - tighter padding for more data visibility
- **Add alternating row colors** for better readability
- **Sticky header** so column names stay visible while scrolling

#### 3. Enhanced Metrics Dashboard (ReturnsMetricsDashboard.tsx)
- Add **Return Rate Distribution** mini chart using recharts (pie chart showing High/Medium/Low split)
- Add **Estimated Cost Impact** card (already calculated but not shown in cards)
- Add **High Confidence Issues** count card
- Better visual hierarchy with gradient card borders for critical metrics
- Show **filtered vs total** counts when filters are active

#### 4. Fix AI Insights Edge Function Call (useAmazonReturns.ts)
- Replace `supabase.functions.invoke('analyze-amazon-returns', ...)` with direct `fetch()` pattern
- Same fix applied to the Replenishment page earlier

#### 5. Add Country & File Name Filters
- Add a file name dropdown filter to the filter panel
- Populate from distinct `file_name` values in the data
- Already supported in types but not in the UI

#### 6. Table Visual Improvements
- Color-coded row backgrounds based on return ratio severity (subtle tint)
- Improved badge designs for confidence and priority scores
- Better responsive behavior for smaller screens

---

### Technical Details

#### Files to Modify

| File | Changes |
|------|---------|
| `src/components/amazon/ReturnsFilterPanel.tsx` | Redesign to horizontal compact layout with collapsible advanced section, add file name filter |
| `src/components/amazon/ReturnsDataTable.tsx` | Fix delete button bug, use SortableTableHeader, add items-per-page selector, add impact column, add row summary, improve styling |
| `src/components/amazon/ReturnsMetricsDashboard.tsx` | Add distribution pie chart, cost impact card, high-confidence issues card, filtered vs total indicator |
| `src/hooks/useAmazonReturns.ts` | Fix `supabase.functions.invoke()` to use direct `fetch()` for AI insights, add file name to filters |
| `src/types/amazon-returns.ts` | Add `fileName` to `ReturnsFilters` type |
| `src/pages/AmazonReturnsAnalysis.tsx` | Minor layout adjustments for new component sizes |

#### Filter Panel - New Layout

```text
+------------------------------------------------------------------+
| [Search ASIN or title...] | High | Medium | Low | [Advanced v]   |
|                                                                  |
| (When Advanced expanded:)                                        |
| [Date Range Picker]  [Ratio Slider 0-100%]  [File: dropdown]    |
|                                              [Clear All Filters] |
+------------------------------------------------------------------+
```

#### Enhanced Table Columns

```text
| [ ] | Image | Product | Shipped | Returned | Ratio | Impact | Confidence | Priority | Date | Actions |
```

#### Metrics Dashboard - New Layout (7 cards in 2 rows)

Row 1 (5 cards): Total ASINs | Total Shipped | Avg Return Ratio | Highest Return | Missing Images
Row 2 (3 cards): Return Distribution (pie) | Cost Impact | High Confidence Issues

#### Bug Fixes Summary
1. Add missing delete action button to each table row
2. Fix AI insights edge function call (region undefined error)
3. Reset page to 1 when sort changes (currently only resets on filter change)

