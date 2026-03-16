

# Fix ASIN Sales Health: Data Loading, Metrics & Pagination

## Bugs Identified

1. **Incomplete data loading**: Supabase returns max 1000 rows by default. With 680 ASINs × multiple months, data is truncated silently. This is why metrics show 0 Growing, 0 Stable, 0 Declining — most monthly records are missing.

2. **Health calculation mismatch**: The hook computes `recentAvg`/`priorAvg` using record-based slicing (`sorted.slice(-3)` = last 3 records the ASIN has), while the dashboard's `getRecentPrior` uses calendar-based slicing (`last12Months.slice(-3)` = last 3 calendar months). This means summary card numbers don't match the table values.

3. **"New" status over-classification**: `sorted.length <= 2 && prior3.length === 0` marks ASINs as "new" even if they're simply low-volume. Should check against calendar months, not record count.

4. **No table pagination**: All 680 rows render at once in a 600px scroll container.

## Plan

### 1. Fix data loading — batched fetch (`useAsinSalesHealth.ts`)
- Use recursive range-based pagination (fetch in batches of 1000 using `.range()`) to load ALL sales records
- Add a secondary `.order('id')` tiebreaker for stable pagination
- Deduplicate with a Set after fetching

### 2. Fix health calculations — calendar-based (`useAsinSalesHealth.ts`)
- Determine the last 12 calendar months from locks (not from records)
- Compute `recentQty` and `priorQty` as sums over the last 3 and prior 3 calendar months respectively (not record-based slicing)
- Fix `changePercent` to use sums instead of averages (matches what the table shows)
- Fix status logic:
  - **New**: ASIN only appears in the most recent 3 months with no prior history
  - **Inactive**: Zero qty in all of the last 3 calendar months, but had sales before
  - **Growing/Declining/Stable**: Based on `changePercent` thresholds (±20%)

### 3. Add pagination (`SalesHealthDashboard.tsx`)
- Add `page` and `pageSize` state (default 50 per page)
- Paginate the `filtered` array
- Add pagination controls at the bottom (Previous/Next, page indicator, page size selector)
- Show "Showing X–Y of Z ASINs"

### 4. Minor improvements
- Add a count badge next to the status filter showing how many match
- Make the "Showing X of Y" footer more informative with pagination context

## Files Modified
- `src/hooks/useAsinSalesHealth.ts` — batched fetch, calendar-based health logic
- `src/components/asin-sales-health/SalesHealthDashboard.tsx` — pagination UI and controls

