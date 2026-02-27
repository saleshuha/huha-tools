

## Root Cause Analysis

I investigated the database and edge function logs. Here's what's happening with ASIN B0DYG62XJJ:

### Problem 1: History showing 2 items

The receiving function was triggered **twice**, 27 seconds apart (02:54:29 and 02:54:56). This happens because:
- The edge function returns an **optimistic response** almost instantly (via `EdgeRuntime.waitUntil`)
- `isProcessing` flips back to `false` immediately, re-enabling the confirm button
- The dialog does **not close** after submission, allowing the user to click again
- Result: Two `receiving_history` records and the inventory quantity incremented twice (from 3→4→5 instead of 3→4)

### Problem 2: Inventory not showing today's update

There are **two duplicate `asin_inventory` records** for B0DYG62XJJ:

| Record | Quantity | Last Updated |
|--------|----------|-------------|
| `0db23545` | 1 | 2025-12-30 (stale) |
| `738896fd` | 5 | 2026-02-27 (today) |

The `updateInventoryStock` function uses `.limit(1).single()` — it picks one record non-deterministically. All stock receiving updates landed on `738896fd`, while the inventory page may display `0db23545` (showing qty 1, no recent update).

---

## Fix Plan

### Fix 1: Prevent double-submission (ReceiveStock.tsx)
- Add a local `isSubmitting` ref/state guard at the top of `handleConfirm`
- Set it `true` immediately on entry, preventing re-entry
- Close the dialog (`setShowDialog(false)`) right after calling `processSingleItem`, not after awaiting results

### Fix 2: Fix inventory record selection (Edge Function)
- In `updateInventoryStock`, add `.order('updated_at', { ascending: false })` before `.limit(1).single()` so it always picks the most recently active record
- This ensures stock updates consistently hit the correct record when duplicates exist

### Fix 3: Consolidate duplicate inventory records (Data fix)
- Merge the two records: add the stale record's quantity (1) to the active record, then delete the stale one
- This is a one-time data cleanup via SQL

### Files Modified
- `src/pages/ReceiveStock.tsx` — double-submit guard + immediate dialog close
- `supabase/functions/smart-stock-receiving/index.ts` — order inventory query by `updated_at DESC`

