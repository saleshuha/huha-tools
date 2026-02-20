
## Market Credit Purchase Tracker — New Feature

### The Problem

You buy stock daily from market suppliers on credit. You get no invoice at time of purchase — only a lump-sum bill later. Currently there is no way to:
- Record what was bought, how many units, and for which platform (Amazon / Noon)
- Track the running credit balance owed to each supplier
- Reconcile the supplier's eventual bill against your own purchase records
- Know whether a bill matches your tracked units and prices

---

### The Solution: "Market Purchases" Module

A dedicated module with 3 interconnected sections:

**Section 1 — Purchase Log (Daily Entries)**
Record each purchase the moment stock arrives from the market.

**Section 2 — Credit Balance Dashboard**
A live view of how much you owe each supplier across all unreconciled purchases.

**Section 3 — Bill Reconciliation**
When the supplier sends a bill, match it against your logged purchases and mark it settled.

---

### How It Works (User Flow)

```text
[Buy stock from market]
        ↓
[Open Market Purchases → Log Purchase]
  - Select supplier
  - Select platform: Amazon / Noon / Both
  - Add items: ASIN/SKU + qty + unit cost (your estimate)
  - Save → entry appears in log
        ↓
[Days/weeks later: supplier sends bill]
        ↓
[Open Bill Reconciliation → Create Bill]
  - Link bill to supplier
  - Enter bill reference number + total amount
  - System shows all unreconciled purchases from that supplier
  - Match bill lines to your logged items
  - Confirm or flag discrepancies
        ↓
[Bill reconciled → balance cleared for matched items]
```

---

### Database Design

**3 new tables:**

**`market_purchases`** — One row per purchase session (a trip to market or a single supplier transaction):
```
id, user_id, supplier_id, purchase_date, platform (amazon/noon/both/po),
status (draft/confirmed/reconciled), notes, total_estimated_cost, created_at
```

**`market_purchase_items`** — Line items within a purchase:
```
id, purchase_id, user_id, asin, sku, title, quantity, unit_cost, total_cost,
platform, country, bill_reconciliation_id (null until reconciled), created_at
```

**`supplier_bills`** — The supplier's invoice when it arrives:
```
id, user_id, supplier_id, bill_reference, bill_date, total_amount, currency,
status (pending/partial/reconciled), notes, reconciled_at, created_at
```

These link to the existing `suppliers` table so supplier data is not duplicated.

---

### UI Structure

**New page: `/market-purchases`** with 3 tabs:

**Tab 1 — Purchase Log**
- Date-filtered table of all market purchase sessions
- Filter by: supplier, platform (Amazon/Noon), status, date range
- Each row shows: date, supplier, platform badge, items count, estimated total, status
- "New Purchase" button → opens a dialog to log items
- Expandable rows to see line items per purchase

**Tab 2 — Credit Balances**
- Card per supplier showing: total unreconciled amount, number of open purchases, oldest purchase date
- Color-coded: green (recent), amber (>15 days), red (>30 days)
- Click card → see all open purchases for that supplier

**Tab 3 — Bill Reconciliation**
- "New Bill" button → enter supplier, bill reference, bill amount, bill date
- System auto-loads all unreconciled purchases for that supplier
- Side-by-side view: Your logged items (left) vs Bill total (right)
- Variance indicator: +/- difference between your records and the bill
- "Reconcile" button marks matched items as settled, clears the credit

---

### Key Features

**Smart Item Entry (in the log dialog)**
- Type ASIN or SKU — auto-fills title from existing inventory/product listings
- Unit cost field (what you expect/agreed to pay)
- Quick platform selector: Amazon / Noon / Both
- Running total shown as you add items

**Credit Balance Tracking**
- Per-supplier running total of unreconciled purchases
- Age of credit (days since oldest purchase)
- Alert when credit exceeds a configurable threshold

**Bill Reconciliation Matching**
- When bill arrives, you enter the bill amount
- System compares against your logged total for that supplier
- If bill amount ≠ logged total → shows red variance warning
- You can adjust unit costs at reconciliation time if supplier charged differently
- Reconcile partially (some items confirmed, some disputed)

**Platform Attribution**
- Every purchase line is tagged Amazon or Noon
- Reports show how much credit is Amazon-related vs Noon-related
- Useful when separate teams manage each platform

---

### Technical Details

**Files to create:**

1. **`src/pages/MarketPurchases.tsx`** — Page wrapper with 3-tab layout
2. **`src/components/market-purchases/PurchaseLogTab.tsx`** — Log + table
3. **`src/components/market-purchases/NewPurchaseDialog.tsx`** — Item entry form
4. **`src/components/market-purchases/CreditBalanceTab.tsx`** — Per-supplier balance cards
5. **`src/components/market-purchases/BillReconciliationTab.tsx`** — Bill matching UI
6. **`src/components/market-purchases/NewBillDialog.tsx`** — Bill entry + reconciliation matching
7. **`src/hooks/useMarketPurchases.ts`** — Data fetching + mutations
8. **`src/hooks/useSupplierBills.ts`** — Bill data + reconciliation logic

**Files to modify:**

9. **`src/App.tsx`** (or router config) — Add route `/market-purchases`
10. **`src/components/AppSidebar.tsx`** — Add nav link

**Database migrations (3 new tables):**
- `market_purchases` with RLS (user_id scoped)
- `market_purchase_items` with RLS
- `supplier_bills` with RLS

---

### Reconciliation Logic

When reconciling a bill:

```text
Supplier Bill Amount:          AED 5,200
Your Logged Items Total:       AED 4,980
─────────────────────────────────────────
Variance:                      +AED 220  ← supplier charged more

→ System flags this
→ You can: Accept bill amount (adjust your records) 
        OR Dispute and mark as "Under Review"
        OR Reconcile partially (some lines confirmed)
```

---

### Summary of What Gets Built

| Component | Purpose |
|---|---|
| Purchase Log | Daily record of market buys with ASIN/SKU + qty + cost |
| Credit Balance Dashboard | Live view of what you owe each supplier |
| Bill Reconciliation | Match supplier invoices to your records |
| Platform Attribution | Tag each purchase Amazon / Noon / Both |
| Variance Detection | Alert when supplier bill ≠ your records |
| Supplier Integration | Reuses existing suppliers table — no duplicate data |

