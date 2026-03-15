

# Advanced ASIN Sales Health Dashboard

## Changes

### 1. Collapsible Upload Section
Wrap the Upload Calendar + MonthlyUploadPanel in a `Collapsible` (already available in `src/components/ui/collapsible.tsx`), closed by default. A trigger button with chevron toggle at the top.

### 2. Merge ASIN/SKU/Title into Single "Product" Column
Combine the three columns into one cell:
- **ASIN** in monospace (top line)
- **SKU** in muted text (same line or below)
- **Title** truncated below in smaller text

### 3. Enhanced Health Analytics
- **Summary Cards**: Add percentage of total next to each count (e.g., "7 (10.6%)"), add a colored progress bar under each card showing proportion
- **Dashboard table improvements**:
  - Remove separate "Trend" sparkline column — integrate the mini bar chart into the Monthly Shipped cell (below the grid)
  - Add "Recent Qty" and "Prior Qty" columns (sum of last 3 months vs prior 3 months) for clearer comparison
  - Color-code the Δ% cell background lightly based on severity
  - Add row highlight: faint red for declining, faint green for growing
- **Status badge**: Keep as-is, already good

## Files Modified
- `src/pages/AsinSalesHealth.tsx` — wrap calendar+upload in Collapsible
- `src/components/asin-sales-health/SalesHealthDashboard.tsx` — merge columns, add recent/prior qty, row highlights, remove trend column
- `src/components/asin-sales-health/HealthSummaryCards.tsx` — add percentages and progress bars

