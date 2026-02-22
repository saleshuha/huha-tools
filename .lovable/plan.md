

## Advanced Credit Balance System

### Current State
- Credit balances are derived from `market_purchase_links` JSONB items where `supplier_name` is set
- Currently only 1 supplier ("Falestine Market") has assigned items with AED 11.00 total
- There is **no payment tracking** -- once items are assigned, there's no way to record payments, partial settlements, or reconciliation
- The current view is read-only cards with a detail dialog

### What Will Change

#### 1. New Database Table: `market_credit_payments`
A payment ledger to track all payments made against supplier credit:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| supplier_name | text | Matches the supplier name from JSONB items |
| amount | numeric | Payment amount |
| payment_date | date | When the payment was made |
| payment_method | text | Cash, bank transfer, cheque, etc. |
| reference_number | text | Receipt/transaction reference |
| notes | text | Optional notes |
| link_ids | uuid[] | Which purchase links this payment covers (optional) |
| created_at | timestamptz | Record timestamp |

RLS policy: users can only see/manage their own payments.

#### 2. Redesigned Credit Balance Tab

**Summary Header** (enhanced):
- Total outstanding, total paid, net balance
- Number of suppliers with balances

**Filter Toolbar**:
- Filter by supplier (dropdown of all suppliers with balances)
- Filter by date range (show only items/links from a specific period)
- Sort by: amount, aging, supplier name

**Supplier Cards** (upgraded):
- Outstanding amount (items total minus payments)
- Total paid amount shown alongside
- Payment progress bar (paid vs outstanding)
- Aging indicator stays (green/orange/red)
- Quick "Record Payment" button directly on the card

**Detail Dialog** (when clicking a supplier card):
- **Two tabs inside**: "Items" and "Payments"
- **Items tab**: existing item detail table grouped by link/order date
- **Payments tab**: history of all payments recorded for this supplier with date, amount, method, reference
- **Record Payment button** at the top of the dialog

#### 3. Record Payment Dialog
A form dialog triggered from the supplier card or detail view:
- Pre-filled supplier name
- Amount field (with "Pay Full" quick-fill button)
- Payment date picker
- Payment method dropdown (Cash, Bank Transfer, Cheque, Credit Card, Other)
- Reference number (optional)
- Notes (optional)
- Save button creates a row in `market_credit_payments`

#### 4. Payment History Section
Below the supplier cards grid, a collapsible "Recent Payments" section showing the last 10 payments across all suppliers in a compact table.

---

### Technical Details

**Database migration:**
- Create `market_credit_payments` table with RLS policies for user-owned data

**New hook:** `src/hooks/useMarketCreditPayments.ts`
- Query payments by user
- Create payment mutation
- Delete payment mutation

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/market-purchases/CreditBalanceTab.tsx` | Full rewrite: add filters, payment-aware balance calculation (outstanding = items total - payments), supplier cards with progress bars, detail dialog with Items/Payments tabs, record payment dialog, recent payments section |
| `src/hooks/useMarketCreditPayments.ts` | New hook for CRUD on `market_credit_payments` |

**Balance calculation logic:**
```
For each supplier:
  items_total = SUM(qty * unit_cost) from all links
  paid_total = SUM(amount) from market_credit_payments
  outstanding = items_total - paid_total
```

Suppliers with outstanding = 0 can be hidden or shown in a "Settled" section.

