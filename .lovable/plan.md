

# Fix: Stock Audit Records Not Showing in Stock History

## Root Cause

Two field mismatches in `useStockAudit.ts` → `applyAuditToInventory()`:

1. **`inventory_type` mismatch**: The audit inserts `inventory_type: 'asin_inventory'`, but the Stock History dialog queries `.eq('inventory_type', 'asin')`. All other code (useAsinInventory, smart-stock-receiving, etc.) uses `'asin'` or `'sku'` — the audit is the only place using `'asin_inventory'`.

2. **Missing `changed_by`**: The audit sets `user_id` but never sets `changed_by`. The Stock History dialog reads `changed_by` to show who made the change, so audit entries appear as "Unknown" user even if they were found.

## Fix

**File: `src/hooks/useStockAudit.ts`** (lines 514-534)

Change the `stock_changes` insert in `applyAuditToInventory`:
- `inventory_type: 'asin_inventory'` → `inventory_type: 'asin'`
- Add `changed_by: user.id`

This is a two-line fix. No database migration needed — the column values are just strings.

## Impact

- Existing audit records already in the DB will still have wrong `inventory_type`. A one-time SQL update can fix historical data:
  ```sql
  UPDATE stock_changes SET inventory_type = 'asin' WHERE inventory_type = 'asin_inventory';
  UPDATE stock_changes SET changed_by = user_id WHERE reference_type = 'stock_audit' AND changed_by IS NULL;
  ```
- Future audits will correctly appear in Stock History with proper user attribution.

