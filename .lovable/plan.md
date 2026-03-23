

# Fix Stock Audit Finalization & Add Audit Trail

## Problems Found

1. **Inventory not reflecting audit data**: 55 ASINs have current quantities that don't match their scanned quantities from the completed audit. The finalization logic has a bug in quantity distribution — when an ASIN has multiple inventory rows, the assignment logic (`Math.min(remaining, item.quantity)`) doesn't properly handle over-scans (where scannedQty > systemQty).

2. **No audit trail**: Zero `stock_changes` records exist with `reference_type = 'stock_audit'`. The finalization only updates `asin_inventory.quantity` without logging the change, so the stock ledger has no record of what happened.

3. **Unscanned items not zeroed**: Items that weren't scanned during the audit should have been set to 0, but some still have stock — the `group.scannedQty !== group.systemQty` condition skips groups that happen to match, but the real issue is the flawed distribution across inventory rows.

## Plan

### 1. Fix `finalizeAudit` in `useStockAudit.ts`

Rewrite the finalization logic to:
- **For each ASIN group** (whether scanned or not):
  - Calculate the target quantity (scannedQty for scanned items, 0 for unscanned)
  - Update `asin_inventory` quantity — for simplicity, set the **first** item to the target qty and all others to 0
  - Insert a `stock_changes` record with `reference_type: 'stock_audit'` for every ASIN where quantity changed, capturing `previous_quantity`, `new_quantity`, `change_amount`, and linking `reference_id` to the audit session

### 2. Add "Re-apply Audit" capability

Add a function `reapplyAudit` that can be triggered from a completed session to re-push the audit quantities to inventory:
- Reads all scans for the session
- Groups by ASIN, calculates scanned totals
- Updates `asin_inventory` and creates `stock_changes` records
- This fixes the current broken state

### 3. Add `stock_audit` to Stock Ledger display

In `StockLedgerRow.tsx`, add the new reference type:
```
stock_audit: { label: 'Audit', className: 'bg-violet-100 text-violet-700 ...' }
```

### 4. Add "Re-apply" button on completed sessions

In `AuditSessionManager.tsx`, add a button on completed sessions to re-push audit data to inventory.

## Files Modified

- **`src/hooks/useStockAudit.ts`** — Fix `finalizeAudit` to properly set quantities and create `stock_changes` records; add `reapplyAudit` function
- **`src/components/stock-history/StockLedgerRow.tsx`** — Add `stock_audit` type config
- **`src/components/stock-audit/AuditSessionManager.tsx`** — Add re-apply button for completed sessions
- **`src/pages/StockAudit.tsx`** — Wire up `reapplyAudit`

