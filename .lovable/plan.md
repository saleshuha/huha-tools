

# Fix Stock Audit: Inactive Rows + Missing History

## Issues Found

### 1. Two ASINs still have wrong quantities
- **B0DYGKYDBF**: scanned=9, but inventory shows 9 (active) + 11 (inactive) = 20 total. Should be 9.
- **B0DYGB6182**: scanned=2, but inventory shows 2 (active) + 2 (inactive) = 4 total. Should be 2.
- **Root cause**: `loadInventoryItems` filters `.eq('is_active', true)`, so the audit never sees or touches inactive rows. Those inactive rows retain their old quantities.

### 2. No audit history in stock_changes
- The `stock_changes` table has 0 records with `reference_type = 'stock_audit'`. The reapply ran but the `if (targetQty === group.systemQty) continue` line skipped items where the active row already matched the scanned qty (because the active row was already correct — it's the invisible inactive rows causing the total mismatch).

### 3. Unscanned items zeroing — works correctly
- Query confirms 0 ASINs with qty > 0 that weren't in the audit (excluding the inactive row issue).

## Fix Plan

### File: `src/hooks/useStockAudit.ts`

**Change `loadInventoryItems`**: Remove the `.eq('is_active', true)` filter so the audit sees ALL inventory rows for the country. This ensures inactive duplicate rows get zeroed out during finalization.

**Change `applyAuditToInventory`**: After processing, also zero out any inactive rows that still have quantity > 0. Specifically:
- Load ALL items (active + inactive) for the country
- When building groups, include inactive item IDs
- The existing logic (first row gets target qty, rest get 0) will naturally zero out the inactive duplicates

**Add stock_changes records**: The existing insert logic is correct but was being skipped because `targetQty === group.systemQty` (only counting active rows). With inactive rows included in `systemQty`, the comparison will now detect the actual discrepancy and create the audit trail records.

### Summary of changes

1. **`loadInventoryItems`** — Remove `is_active` filter (1 line change)
2. **`applyAuditToInventory`** — Use its own load call that also omits `is_active` filter (already calls `loadInventoryItems` so this is automatic)
3. After fix, user triggers "Re-apply" once more to fix the 2 remaining ASINs and generate the missing `stock_audit` history entries

### Files Modified
- **`src/hooks/useStockAudit.ts`** — Remove `is_active` filter from `loadInventoryItems` to include all inventory rows in audit processing

