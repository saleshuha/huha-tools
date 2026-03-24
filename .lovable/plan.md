

# Fix: Orders Not Showing in Print View

## Root Cause — Two Bugs

### Bug 1: Broken `order_date` filter (critical)
The `order_place_date` column stores dates as human-readable text: `"23 Mar 2026, 12:00:02 PM GMT"`. The function compares with `to_char(start_date, 'YYYY-MM-DD')` → `"2026-03-23"`. These string formats are incompatible — comparison NEVER produces correct results.

### Bug 2: Default "today" shows empty results
Default date range is "today" but latest orders were uploaded yesterday. User sees "No orders found" on page load.

## Fix

### 1. Database migration: Fix `get_printable_orders` function

Rewrite the `order_date` CASE branch to properly parse the human-readable date string using `to_timestamp()`:

```sql
WHEN date_filter_type = 'order_date' THEN
  o.order_place_date IS NOT NULL AND
  to_timestamp(o.order_place_date, 'FMDD Mon YYYY, FMHH12:MI:SS AM TZ')::date >= start_date::date AND
  to_timestamp(o.order_place_date, 'FMDD Mon YYYY, FMHH12:MI:SS AM TZ')::date <= end_date::date
```

This converts `"23 Mar 2026, 12:00:02 PM GMT"` to a proper timestamp before comparing dates.

### 2. Client-side: Default to "week" range instead of "today"

In `DateWiseOrderPrint.tsx`, change the default `dateRange` state from `'today'` to `'week'` so the initial load captures recent uploads:

```typescript
const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
```

## Files Modified
- **Database migration** — Fix `order_place_date` comparison in `get_printable_orders`
- **`src/components/label/DateWiseOrderPrint.tsx`** — Change default date range to 'week'

