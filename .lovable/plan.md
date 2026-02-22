

## Fix Credit Balances and Redesign Core Tabs

### The Problem

The **Credit Balances** tab shows "No outstanding credit balances" because it queries the `market_purchases` table, which has **0 rows**. Your actual purchase data lives in `market_purchase_links` (items stored as JSONB with supplier assignments). The credit balance logic needs to be rewired to this real data source.

### What is Credit Balance?

Credit balance tracks how much you owe each supplier for items they've been assigned (via purchase links) but haven't been paid/reconciled yet. It groups assigned items by supplier name, sums up `qty x unit_cost`, and shows aging information based on when the link was created.

---

### Changes Overview

#### 1. Fix Credit Balances (rewire data source)

- **Rewrite `CreditBalanceTab.tsx`** to derive balances from `market_purchase_links` JSONB items where `supplier_name` is present
- Group by `supplier_name` (not `supplier_id`) since that's what the portal stores
- Calculate: total cost (qty x unit_cost), item count, oldest link date per supplier
- The detail dialog will show individual items for a supplier across all links
- Add a reconcile/mark-paid action button per supplier card

#### 2. Redesign Daily Orders Tab

- Clean up the summary cards with a more compact, unified stat bar instead of 3 separate cards
- Add item count badge to the toolbar area
- Tighten table row spacing and improve the mobile card layout consistency

#### 3. Redesign Purchase Log Tab

- Replace the flat list layout with a proper table on desktop (image, product, supplier, qty, cost, date, actions)
- Improve the summary cards to match the design language of other tabs
- Add a total cost footer row

#### 4. Redesign Item Costs Tab

- Add supplier name column to the table (it's stored but not displayed)
- Improve the history columns — show supplier name below the cost in history entries
- Better empty state with illustration

---

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/market-purchases/CreditBalanceTab.tsx` | Rewrite to query `market_purchase_links` JSONB, group by `supplier_name`, show real credit data |
| `src/hooks/useMarketPurchases.ts` | Remove old `creditBalancesQuery` (no longer needed) |
| `src/components/market-purchases/DailyOrdersTab.tsx` | Compact stat bar, tighter spacing |
| `src/components/market-purchases/PurchaseLogTab.tsx` | Desktop table layout, cost footer |
| `src/components/market-purchases/ItemCostsTab.tsx` | Add supplier name column |

**Data flow for Credit Balances:**
- Query `market_purchase_links` for the user
- Extract items from JSONB where `supplier_name IS NOT NULL`
- Group by `supplier_name`: sum `qty * unit_cost`, count items, track oldest link date
- Display as supplier cards with aging indicators (same color logic: green/orange/red)
- Detail dialog shows all items assigned to that supplier with link references

**No database changes required** — all data already exists in `market_purchase_links.items` JSONB.

