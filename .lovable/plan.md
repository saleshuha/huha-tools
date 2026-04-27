# Serial Range Planner — Persisted Saved Plan + Realtime

## Problem

Right now the Serial Range Planner always re-computes a fresh plan from current inventory whenever it opens. The "saved plan" in `serial_range_directory` is only written on Save and never read back. So users can't see their last saved ranges, can't edit them, and any drift between inventory and the saved plan is invisible.

## Goal

- When the planner opens, **load the last saved ranges** from `serial_range_directory` and show them as the active plan.
- Keep a **realtime view** of the saved plan — if rows change in `serial_range_directory` (e.g. `items_used` decremented by Bulk Serial Cleanup, or another tab saves a plan), the dialog updates immediately.
- Allow the user to **edit** (gaps, custom gaps, ordering) on top of the saved plan and **re-save** — the new save replaces the previous one, and that becomes the new "last saved" view.
- Provide a clear way to switch between **"Saved Plan" (last save)** and **"Recompute from current inventory"** so the user can intentionally regenerate when inventory has grown.

## UX

In `SerialSequencingAdvisor.tsx` dialog:

1. On open:
   - Fetch all rows from `serial_range_directory` for the current user.
   - If rows exist → show them as the active plan ("Saved plan • last updated <time>" badge in header).
   - If no rows exist → fall back to the computed plan from inventory (current behavior) and label it "New plan (not yet saved)".

2. New header controls:
   - Mode toggle: **Saved Plan** ↔ **Recompute from Inventory**.
     - Saved Plan: ranges come from DB. Edits adjust those rows.
     - Recompute: current behavior — generates from inventory using the gap percentages. Useful when new categories/brands have appeared.
   - "Last saved: <relative time>" label when in Saved mode.
   - A "Refresh" button to re-pull from DB on demand.

3. Editing in Saved mode:
   - Each brand row shows `range_start`–`range_end` and `items_used`, both editable inline (small numeric inputs, same style as existing gap inputs).
   - Category gap input still works — changing it adjusts the next category's start.
   - Reordering arrows still work; order is held in local state until Save.
   - "Save Plan" performs delete-then-insert (existing pattern), persisting the edited rows.

4. Realtime:
   - Subscribe to `serial_range_directory` changes filtered by `user_id` via Supabase Realtime channel while the dialog is open.
   - On INSERT / UPDATE / DELETE, refetch and update the active plan **only when not in the middle of an unsaved edit**. If user has unsaved edits, show a small "Saved plan changed elsewhere — Refresh" toast/banner instead of overwriting their work.

5. Recompute mode:
   - Shows the inventory-derived plan (today's behavior).
   - A "Compare with saved" badge highlights brands whose computed range differs from the saved one (count mismatches), so the user knows when a re-save is appropriate.

## Technical

### File: `src/components/SerialSequencingAdvisor.tsx`

1. Add state: `mode: 'saved' | 'compute'`, `savedRows: SavedRow[]`, `savedUpdatedAt: string | null`, `loadingSaved: boolean`, `dirty: boolean`, `pendingRefresh: boolean`.
2. New `SavedRow` type mirroring the table row shape (`id, category, brand, range_start, range_end, items_used, updated_at`).
3. `loadSavedPlan()`:
   - `supabase.from('serial_range_directory').select('*').eq('user_id', user.id).order('range_start')`.
   - Group rows into `CategoryPlan[]` (category → brands) so the existing render code works unchanged.
   - Set `savedUpdatedAt` to the max `updated_at`.
4. On dialog open (`useEffect` keyed on `isOpen`):
   - Call `loadSavedPlan()`. If empty → set `mode='compute'`, else `mode='saved'`.
5. Realtime: while `isOpen`, subscribe to channel `serial-range-directory-${user.id}` on `postgres_changes` for that table+user. On any event:
   - If `dirty` → `setPendingRefresh(true)` and show a small banner "Saved plan changed — Refresh to load latest".
   - Else → `loadSavedPlan()`.
   - Cleanup subscription on close.
6. Build `activePlan` selector: `mode === 'saved' ? savedPlan : computedPlan`. The existing render block uses `activePlan` instead of the current `plan` variable.
7. Edits in saved mode:
   - Brand-level `range_start` / `range_end` / `items_used` inline inputs that mutate a local `editedSavedPlan` and set `dirty=true`.
   - Category gap input continues to work; we recompute downstream `range_start` for following categories when the user changes a gap.
8. `savePlan()` (existing) — already does delete + insert. Adapt to serialize from `activePlan` (saved or computed). After save: refetch via `loadSavedPlan()`, switch to `mode='saved'`, clear `dirty`.
9. Header:
   - Add toggle (Tabs or two `Button`s) for mode.
   - Show "Saved <relativeTime>" badge (use a lightweight inline formatter; no new deps).
   - Add Refresh button (calls `loadSavedPlan()`).
10. Banner row above the plan list when `pendingRefresh` is true: "Saved plan changed elsewhere" + Refresh button.

### No DB or migration changes needed
The `serial_range_directory` table already supports everything required. Bulk Serial Cleanup's existing decrement of `items_used` will now be reflected live in the planner via the realtime subscription.

### Files touched
- `src/components/SerialSequencingAdvisor.tsx` (single file change)
