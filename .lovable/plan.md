

## Fix Purchase Link Layout Bugs and Add Last Cost Date

### Problems Identified

1. **DailyOrdersTab consolidated table has no mobile layout** -- The orders table is a plain `<table>` with no responsive breakpoint. On mobile screens it gets compressed and overlaps.

2. **Public purchase link desktop table (`MarketPurchasePublic.tsx`)** -- The Supplier column uses a fixed `w-36` select and cost uses `w-24` input, which squeezes on medium screens (768-1024px). The `hidden md:block` breakpoint means iPads still see the cramped table.

3. **No "last cost" info on the public purchase link** -- The DailyOrdersTab already fetches `costDate` from `market_item_costs`, but the public purchase page does not show when a cost was last recorded.

---

### Changes

#### A) DailyOrdersTab -- Add mobile card layout for the consolidated orders table

**File: `src/components/market-purchases/DailyOrdersTab.tsx`**

- Add a mobile card view (`md:hidden`) mirroring the existing table data (image, title, ASIN/SKU, source badges, qty, unit cost with date, line total).
- Hide the existing `<table>` on mobile (`hidden md:block`).
- Cards will use the same image/cost rendering logic already in the table rows.

#### B) MarketPurchasePublic -- Fix table column sizing

**File: `src/pages/MarketPurchasePublic.tsx`**

- Change desktop table breakpoint from `md:block` to `lg:block` so tablets get the card layout instead of a cramped table.
- Change mobile cards from `md:hidden` to `lg:hidden`.
- Remove fixed `w-36` on supplier select trigger -- use `w-full min-w-[120px]` instead.
- Remove fixed `w-24` on cost input -- use `w-full max-w-[100px]` instead.
- Add `table-layout: auto` and `min-w-[700px]` on the table with a scrollable wrapper to prevent column overlap on mid-size screens.

#### C) MarketPurchasePublic -- Show last cost date

**File: `src/pages/MarketPurchasePublic.tsx`**

- After fetching the link data, query `market_item_costs` via a new lightweight approach: use the existing data in the link's `items` JSON (unit_cost is already stored there from previous saves).
- Add a `last_cost_date` field to the local item state. During `fetchLink`, after loading items, batch-fetch cost records from `market_item_costs` for the link owner using a new RPC `get_cost_dates_for_asins(p_user_id, p_asins)` that returns `asin, unit_cost, updated_at`.
- Display the last cost date as a small muted line under the unit cost input (e.g., "Last: 12.50 on 20 Feb 2026") in both desktop and mobile views.
- On save, update the local `last_cost_date` to "just now".

**Database migration:**

- Create RPC `get_cost_dates_for_asins(p_user_id uuid, p_asins text[])` with `SECURITY DEFINER` that returns `(asin text, unit_cost numeric, updated_at timestamptz)` from `market_item_costs` filtered by user and ASINs.

### Technical Details

**New RPC:**
```sql
CREATE OR REPLACE FUNCTION public.get_cost_dates_for_asins(p_user_id uuid, p_asins text[])
RETURNS TABLE(asin text, unit_cost numeric, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT c.asin, c.unit_cost, c.updated_at
  FROM public.market_item_costs c
  WHERE c.user_id = p_user_id AND c.asin = ANY(p_asins);
$$;
```

**LinkItem interface update:**
```typescript
interface LinkItem {
  // ...existing fields
  last_cost_date?: string;
  last_cost_value?: number;
}
```

