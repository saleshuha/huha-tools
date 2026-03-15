

## Plan: Fix Data Loss During Bulk Fulfillment

### Root Cause

In `BulkFulfillProcessor.tsx` line 201, `onComplete()` is called immediately when processing finishes — while the user is still viewing the summary report in the dialog. This triggers `handleBulkFulfillComplete` in `POTracker.tsx` (line 1078-1082) which does:

1. `queryClient.invalidateQueries({ queryKey: ['po-orders'] })` — triggers a full re-fetch
2. `fetchPOOrders(true)` — triggers ANOTHER full re-fetch (3500+ orders, ~72s)

This double re-fetch happens while the dialog is still open. When the data reloads, the snapshot lock ref (`lockedFilterIdsRef`) still holds old IDs, but the underlying orders array gets replaced. The snapshot lock mechanism then can't find the old IDs in the new data, causing rows to vanish. Additionally, with `staleTime: 0` on the query, every refetch overwrites the cache immediately.

### Fix

**File: `src/components/po-tracker/BulkFulfillProcessor.tsx`**
- Remove `onComplete()` call from end of `startProcessing` (line 201)
- Instead, call `onComplete()` only when the user **closes the dialog** after viewing the summary (in `handleClose`, only if phase is `summary`)
- This ensures data refresh happens after the user is done reviewing results

**File: `src/components/POTracker.tsx`**
- In `handleBulkFulfillComplete`: remove the redundant double-fetch. Keep only `queryClient.invalidateQueries` (which already triggers a re-fetch via React Query). Remove `fetchPOOrders(true)` to avoid the duplicate heavy fetch
- Clear the snapshot lock (`lockedFilterIdsRef.current = null`) so the refreshed data isn't filtered against stale IDs

### Changes Summary

```text
BulkFulfillProcessor.tsx:
  Line 201: Remove onComplete() from startProcessing
  handleClose: Call onComplete() when closing from summary phase

POTracker.tsx:
  handleBulkFulfillComplete:
    - Remove fetchPOOrders(true) (redundant with invalidateQueries)
    - Clear lockedFilterIdsRef.current = null
    - Clear selectedForPrint
```

