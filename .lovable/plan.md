

## Advanced Bill Reconciliation System Redesign

### The Problem

The current Bill Reconciliation tab is broken -- it tries to reconcile bills against `market_purchases` (which has **0 rows**). Your real data lives in `market_purchase_links` JSONB items. The reconciliation system needs to be completely rewired to work with the same data source as Credit Balances and integrate with the payment ledger (`market_credit_payments`).

### What Will Change

#### 1. Rewired Data Source

Instead of querying empty `market_purchases`, the reconcile dialog will pull unreconciled items from `market_purchase_links` JSONB, grouped by supplier -- the same source as Credit Balances. When creating a new bill, the system will auto-suggest the outstanding amount from credit balances.

#### 2. Redesigned Summary Stats Bar

Replace the 3 separate stat cards with a compact horizontal stat bar (matching Daily Orders and Purchase Log style):
- **Pending** count with amber indicator
- **Reconciled** count with green indicator
- **Disputed** count with red indicator
- **Total Outstanding** amount
- **Total Reconciled** amount

#### 3. Enhanced New Bill Dialog

- Auto-populate supplier dropdown from `market_purchase_links` supplier names (not just the suppliers table)
- Show the supplier's current outstanding credit balance next to their name
- "Import from Credit" button that auto-fills the bill amount from the supplier's outstanding balance
- Option to attach specific purchase link items to the bill

#### 4. Redesigned Reconcile Dialog

The reconcile dialog will show items from `market_purchase_links` instead of `market_purchases`:
- **Left side**: Bill details (reference, date, amount, supplier)
- **Right side**: Matching items from purchase links for that supplier
- Item-level checkboxes to select which items this bill covers
- Running total of selected items vs bill amount
- Variance indicator (over/under)
- Cross-reference with payments from `market_credit_payments`

#### 5. Bill Detail View

Clicking a bill row opens a detail dialog showing:
- **Bill Info tab**: Reference, date, amount, status, notes
- **Matched Items tab**: Items that were reconciled against this bill (from purchase links)
- **Payment History tab**: Related payments from `market_credit_payments` for that supplier around the bill date

#### 6. Enhanced Table

- Add filter toolbar: filter by status, supplier, date range
- Add supplier filter dropdown (populated from bills + credit balance suppliers)
- Mobile-responsive card layout for small screens
- Alternating row shading with status color-coded left border
- Expandable rows showing matched items inline

---

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/market-purchases/BillReconciliationTab.tsx` | Full rewrite: compact stat bar, filter toolbar, enhanced table with expandable rows, mobile cards, bill detail dialog |
| `src/components/market-purchases/NewBillDialog.tsx` | Add supplier auto-suggestion from purchase links, show outstanding balance, "Import from Credit" button |
| `src/hooks/useSupplierBills.ts` | Update `reconcileBill` to work with `market_purchase_links` items instead of `market_purchases`, add new `supplier_bills` columns via migration for `linked_item_ids` (JSONB array of item references) |

**Database migration:**
- Add `linked_items` column (JSONB) to `supplier_bills` to store which purchase link items are matched to this bill (array of `{link_id, asin, sku, qty, unit_cost}`)

**Reconciliation flow:**
1. User creates a bill (supplier, amount, reference, date)
2. User clicks "Reconcile" on a pending bill
3. Dialog shows all unreconciled items from `market_purchase_links` for that supplier
4. User selects items that match the bill
5. System compares selected items total vs bill amount
6. If match: status = "reconciled"; if partial: status = "partial"; if mismatch: option to mark "disputed"
7. Selected item references are stored in `supplier_bills.linked_items` JSONB
8. Credit balance for that supplier is reduced by reconciled amounts

**No changes to `market_purchase_links` table** -- reconciliation metadata is stored on the bill side via the new `linked_items` JSONB column.

