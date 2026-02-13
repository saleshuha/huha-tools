

# Fix: Connection Pool Exhaustion on Stock Receiving Page

## Problem
Every request to the database is returning "Timed out acquiring connection from connection pool" (504 errors). The page fires 10+ simultaneous database queries on load, which exhausts the Supabase connection pool.

## Root Cause
On mount, these queries all fire at once:
1. Dashboard metrics: 4 parallel HEAD queries (po_orders, pending, receiving_history, po_groups)
2. usePOGroups: 2 parallel queries (po_groups SELECT + get_po_group_summaries RPC)
3. update_ungrouped_po_priorities RPC (fired after groups load)
4. label_templates: 2 queries (PO templates + inventory templates)
5. Receiving sessions query
6. Background tasks query
7. Profile query

That is 12+ connections hitting the pool simultaneously, causing all of them to time out.

## Solution: Stagger and Reduce Queries

### 1. ReceiveStock.tsx -- Stagger dashboard metrics (sequential instead of parallel)
- Replace `Promise.all` with sequential queries using a single combined approach
- Delay metrics loading by 500ms to let auth and critical queries complete first
- Combine the 2 template queries into 1 query with an OR filter

### 2. usePOGroups.ts -- Sequential instead of parallel
- Change the `Promise.all([groupsResult, summariesResult])` to sequential calls
- The RPC already returns all needed data; consider if we even need the separate groups query
- Remove the automatic `updateUngroupedPriorities.mutate()` call from `onSuccess` of createGroup/updateGroup -- this is a heavy RPC that fires frequently and can be triggered manually or with a debounce

### 3. Remove auto-fire of updateUngroupedPriorities
- This RPC fires on every group create/update/priority change, adding unnecessary load
- Make it opt-in or remove it from automatic triggers

### 4. Add error resilience
- Wrap dashboard metric queries with individual try/catch so one failure doesn't block others
- Add retry delay on connection pool errors

## Technical Changes

**File: `src/pages/ReceiveStock.tsx`**
- Change dashboard metrics from `Promise.all` (4 simultaneous) to sequential queries with a startup delay
- Merge the 2 template queries into 1 combined query
- Add 1-second delay before loading metrics to let auth settle

**File: `src/hooks/usePOGroups.ts`**  
- Change from `Promise.all` to sequential: first fetch groups, then fetch summaries
- Remove automatic `updateUngroupedPriorities.mutate()` calls from mutation `onSuccess` handlers (this was firing the heavy RPC after every group action)
- Add `retry: 1` and `retryDelay: 2000` to the query config to handle transient pool issues

