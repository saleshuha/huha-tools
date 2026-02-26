

## Fix: Missing `user_id` Filter in QuantityConfirmDialog PO Queries

### Root Cause

`loadAvailablePOs()` in `QuantityConfirmDialog.tsx` queries `po_orders` **without filtering by `user_id`**. Every other PO query in the codebase (e.g., `usePOOrdersQuery`, `PriorityPOList`) correctly filters by the authenticated user. This dialog does not, so it pulls POs from ALL users — resulting in 482 POs and a max qty of 1161 for ASIN B0FRZKZRDG when the current user only has ~2 units.

### Fix

**File: `src/components/stock-receiving/QuantityConfirmDialog.tsx`**

1. At the start of `loadAvailablePOs()`, fetch the current user via `supabase.auth.getUser()`
2. Add `.eq('user_id', user.id)` to all three PO query branches:
   - Line 134: `po_group` branch
   - Line 141: `po_numbers` branch  
   - Lines 158-160: fallback ASIN/SKU/model search branch

### Files Modified
- `src/components/stock-receiving/QuantityConfirmDialog.tsx` — Add `user_id` filter to all PO queries

