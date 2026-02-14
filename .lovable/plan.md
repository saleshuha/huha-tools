

# Fix: Stock Receiving Page Loading & PO Groups Not Showing

## Problem
The page still fails to load PO groups and metrics due to two compounding issues:

1. **Duplicate profile queries**: `useUserProfile` fires `fetchProfile` twice on every mount -- once from `onAuthStateChange(INITIAL_SESSION)` and once from `getSession()`. Since 20+ components use this hook, each instance creates 2 profile queries, flooding the connection pool.

2. **RPC failure kills the entire query**: In `usePOGroups`, if `get_po_group_summaries` RPC times out, the entire `queryFn` throws an error. This means even though the basic `po_groups` SELECT succeeds (confirmed in network logs -- 4 groups returned), the component shows "0 Groups" because the RPC failure discards everything.

3. **Postgres statement timeouts**: The logs show repeated "canceling statement due to statement timeout" errors, confirming the database is under heavy load from redundant queries.

## Solution

### 1. Fix `useUserProfile` duplicate queries (`src/hooks/useUserProfile.ts`)
- Add a flag (`fetchedRef`) to prevent `fetchProfile` from being called twice for the same user ID
- When `onAuthStateChange` fires with `INITIAL_SESSION`, it will fetch the profile. The subsequent `getSession` call will see the flag and skip
- This immediately cuts the profile queries from 2 to 1 per hook instance

### 2. Make RPC failure non-fatal in `usePOGroups` (`src/hooks/usePOGroups.ts`)
- Wrap the `get_po_group_summaries` RPC call in a try/catch
- If the RPC fails, still return the groups from the basic SELECT query with zero counts
- This ensures groups always display even when the database is under load
- The counts will be approximate (0) but the group names, priority, and structure will be visible

### 3. Add `enabled` guard to `usePOGroups` query
- The `usePOGroups` query currently fires immediately on mount, even before auth is confirmed
- Add a check that only runs the query after a valid user session exists
- This prevents an unnecessary failed query attempt

## Technical Changes

**File: `src/hooks/useUserProfile.ts`**
- Add `useRef` for tracking if fetch was already initiated for current user
- In both `onAuthStateChange` callback and `getSession` result, check the ref before calling `fetchProfile`
- Reset the ref when user changes (sign out / different user)

**File: `src/hooks/usePOGroups.ts`**
- Wrap the `get_po_group_summaries` RPC call in try/catch
- On RPC failure, log a warning and return groups with `member_count: 0`, `total_quantity: 0`, `po_numbers: []`
- This makes the groups list resilient to RPC timeouts

## Expected Impact
- Profile queries reduced from 2 to 1 per hook instance (saves 20+ connections on app load)
- PO groups will always display even under database load
- Metrics will load more reliably with fewer concurrent connections
- The "0 Groups" issue will be fixed since groups will render even when the RPC is slow

