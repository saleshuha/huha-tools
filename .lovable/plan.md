

## Plan: Comprehensive Metrics Dashboard on Homepage

### Overview
Replace the Quran disabled state with a full metrics dashboard while keeping Quran features accessible via a tab. The dashboard will have three sections: **Inventory**, **Replenishment**, and **Amazon/PO** metrics with clickable cards, export capability, and full data fetching (bypassing the 1000-row limit).

### Architecture

```text
Homepage
├── Tab: Dashboard (default)
│   ├── Section: Inventory Metrics
│   │   ├── Total Items, In-Stock, Out-of-Stock, Sold, Ordered, Low Stock, New (7d)
│   │   └── Country breakdown (UAE/KSA), Status distribution chart
│   ├── Section: Replenishment Metrics  
│   │   ├── Items Needing Restock, Avg Lead Time, Safety Stock Coverage
│   │   └── Velocity categories (Fast/Medium/Slow), Eligible for restock count
│   └── Section: Amazon / PO Metrics
│       ├── Total POs, Total PO Qty, Printed vs Pending, Location-wise breakdown
│       ├── Sunsky sourced items count, Supplier order stats
│       └── Status breakdown (open/closed/pending)
└── Tab: Quran (existing QuranHomepage)
```

### Data Fetching Strategy
Create a new hook `src/hooks/useDashboardMetrics.ts` that:
- Uses paginated fetching (1000 per page, loop until exhausted) for `asin_inventory`, `po_orders`, `stock_changes`
- Uses `select('*', { count: 'exact', head: true })` for counts where full data isn't needed
- Fetches replenishment data via existing RPC `get_replenishment_items_optimized`
- All queries run in parallel via `Promise.all` with staggered starts to avoid connection pool exhaustion
- Caches with React Query (5 min stale time)

### New Files
1. **`src/hooks/useDashboardMetrics.ts`** — Hook fetching all metrics with pagination
2. **`src/components/dashboard/MetricsDashboard.tsx`** — Main dashboard component with 3 sections

### Modified Files
1. **`src/components/quran/QuranHomepage.tsx`** — Add tabs: Dashboard + Quran, dashboard as default tab
2. **`src/pages/Homepage.tsx`** — Update page tracking

### Metrics Detail

**Inventory Section** (from `asin_inventory`):
- Total Items (count), In-Stock, Out-of-Stock, Sold, Ordered, Damaged, Reserved
- Low Stock (qty 1-5), New Added (last 7 days), Country split (UAE/KSA)
- Total Quantity sum across all items

**Replenishment Section** (from RPC + `replenishment_calculation_configs`):
- Items Needing Restock, Urgent items, Total Recommended Qty
- Active configs count, Eligible for restock count
- Days since last restock (avg)

**Amazon/PO Section** (from `po_orders`):
- Total POs (unique po_number), Total Items, Total Qty
- Printed count / qty, Pending (not printed) count / qty
- Location-wise breakdown (`ship_to_location` grouped)
- Sunsky-sourced items (`sunsky_credentials_id IS NOT NULL`)
- Status breakdown: open, closed, pending
- Total cost (sum of `total_cost`)

### Clickable + Export
- Each metric card is clickable — navigates to the relevant page (e.g., clicking "In-Stock" goes to `/inventory`)
- Export button generates a CSV summary of all dashboard metrics
- Refresh button to reload all data

### UI Pattern
Uses existing `CompactStatBar` for pill metrics, `Card` for section headers, and `recharts` for any charts (status distribution pie/bar). Follows the standardized design system with `h-8` controls and `text-xs` typography.

