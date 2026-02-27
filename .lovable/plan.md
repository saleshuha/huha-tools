

## Issues Found in Today's Changes

### Issue 1: `isSubmittingRef` never reset on early return (Critical - blocks all future submissions)

In `ReceiveStock.tsx` line 329, `isSubmittingRef.current = true` is set, and then the dialog is closed on line 332. But on line 334-339, there's an early `return` if no printer is selected — **without resetting `isSubmittingRef.current = false`**. After this happens once, the user can never submit again until they refresh the page.

**Fix**: Reset `isSubmittingRef.current = false` before the early return on line 339.

### Issue 2: Edge function can update inactive inventory records (Data integrity)

In `updateInventoryStock` (edge function line 846-855), the query finds inventory items without filtering `is_active`. If there are multiple records for the same ASIN (one active, one inactive), the `order('updated_at', { ascending: false })` picks whichever was updated most recently — which could be the inactive one. Stock gets added to an invisible record.

**Fix**: Add `.or('is_active.is.null,is_active.eq.true')` to the inventory query in the edge function, so it only updates active records.

### Issue 3: Edge function doesn't restore `is_active` on stock update

When the edge function updates inventory (line 877-884), it sets `quantity` and `status: 'in-stock'` but never sets `is_active: true`. If an item was previously disabled, receiving stock won't make it visible again.

**Fix**: Add `is_active: true` to the update payload at line 880.

---

### Files to Modify

1. **`src/pages/ReceiveStock.tsx`** — Add `isSubmittingRef.current = false` before the early return at line 339
2. **`supabase/functions/smart-stock-receiving/index.ts`** — Add `is_active` filter to inventory query + set `is_active: true` in the update payload

