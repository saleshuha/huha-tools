

# Stock Receiving Flow - Bug Audit & Fixes

## Bugs Found

### Bug 1: `computeQuantityAllocation` ignores already-received quantity (CRITICAL)
**File**: `supabase/functions/smart-stock-receiving/index.ts` line 763
**Problem**: Uses `po.quantity` (full PO quantity) as `neededQty` instead of subtracting `printed_quantity`. A PO needing 5 units with 3 already received will still allocate up to 5 units, over-fulfilling the PO.
**Fix**: Change `neededQty` to `po.quantity - (po.printed_quantity || 0)` and skip POs where remaining <= 0.

### Bug 2: `locateMatchingPurchaseOrders` doesn't exclude fully-received POs
**File**: line 732-747
**Problem**: Queries POs with `status IN ('pending', 'placed')` but doesn't check `is_printed` or whether `printed_quantity >= quantity`. A PO that's been fully received (but not yet closed) can be matched and double-fulfilled.
**Fix**: Add filter `.or('printed_quantity.is.null,printed_quantity.lt.quantity')` or filter in code after fetch.

### Bug 3: No audit trail for PO-only fulfillments
**File**: lines 469-475
**Problem**: When all units go to POs (`remainingQuantity === 0`), no `stock_changes` record is created. This breaks the audit trail for PO fulfillment events - the performance metrics (PO sold tracking) can't see these transactions.
**Fix**: Insert a `stock_changes` record with `reference_type: 'po_order'` and `change_amount: 0` (or negative allocated amount) even when skipping inventory update.

### Bug 4: Status inconsistency between manual and auto allocation
**File**: line 368 vs line 736
**Problem**: Manual allocation accepts `['pending', 'placed', 'shipped']` statuses, but auto allocation only accepts `['pending', 'placed']`. An item with status `'shipped'` will be found manually but missed in auto mode.
**Fix**: Align both to use the same status set: `['pending', 'placed', 'shipped']`.

### Bug 5: `markPOAsPrinted` sets status to `'closed'` but auto-match still finds `'pending'` POs
**File**: line 799
**Problem**: When `newPrintedQuantity >= po.quantity`, status changes to `'closed'` — this is correct. But for partial fulfillments the status stays as-is, meaning the same PO can be matched again in the next receiving session. Combined with Bug 2, this leads to over-allocation.
**Impact**: This is already handled by Bug 1 fix (checking remaining needed qty). No separate fix needed.

## Implementation Plan

### Changes to `supabase/functions/smart-stock-receiving/index.ts`:

1. **Fix `computeQuantityAllocation`** (line 753-778):
   - Calculate `remainingNeeded = po.quantity - (po.printed_quantity || 0)`
   - Skip POs where `remainingNeeded <= 0`
   - Allocate `Math.min(remainingQty, remainingNeeded)`

2. **Fix `locateMatchingPurchaseOrders`** (line 727-747):
   - After fetching, filter out POs where `printed_quantity >= quantity`
   - Add `'shipped'` to accepted statuses to align with manual allocation

3. **Add PO fulfillment audit record** (after line 475):
   - When `remainingQuantity === 0`, insert a `stock_changes` record with `reference_type: 'po_order'` and the allocated quantity as a negative change, without modifying the inventory quantity

4. **Redeploy the edge function**

These fixes address the core issue: the system can over-allocate to POs that are partially or fully received, and lacks audit records for PO-only receiving events.

