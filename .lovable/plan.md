# Add Delta Stock Sync — Second External Destination

## Goal

Add a new "Delta Stock Sync" connection on the **App Sync** tab (Shopify Sync page) that pushes ASIN inventory **changes** (deltas) to a second external app via its `POST /api/public/sync/stock` endpoint. Keeps the existing huha sync untouched.

## Endpoint Contract

- `POST {base_url}/api/public/sync/stock`
- Headers: `Authorization: Bearer sp_live_...`, `Content-Type: application/json`
- Body: `{ source, items: [{ asin, delta, reference_id?, notes? }] }` (1–500 items, delta in [-10000, 10000])
- 200 → `{ applied, skipped, results: [{ asin, delta, balance_after }] }`
- Errors: 401 / 403 / 400 / 429
- Rate limit: 60 req/min per key → batch up to 500 items per call, throttle.

## UI

New card under existing "External App Connection" on the App Sync tab:

**Card 1 — Delta Sync Settings** (`DeltaSyncSettings.tsx`)
- Base URL input (default the lovableproject.com URL from the docs, editable)
- API Key input (`sp_live_...`, masked, with show/hide toggle)
- Source label input (default `huha-tools`, ≤80 chars)
- Auto-Push toggle ("Push stock changes in real time")
- Save / Test Connection buttons (Test sends a dry `{items: []}` or a 0-delta sample to verify auth)

**Card 2 — Delta Sync Dashboard** (`DeltaSyncDashboard.tsx`)
- Status row: last push time, total applied, total skipped (today), key status badge
- "Reconcile Now" button → manual one-shot push of pending deltas
- Pending queue summary (count of un-pushed deltas)
- Recent results list (last 50): ASIN, delta sent, balance_after, status, timestamp

Both cards rendered inside the existing `app-sync` `TabsContent` in `src/pages/ShopifySyncPage.tsx`, below the current `ExternalSyncSettings` / `ExternalSyncDashboard`.

## Data Flow

### Auto-push (real-time)
1. Trigger on every insert into `stock_changes` (the advanced stock ledger that already records all qty mutations).
2. Insert a row into a new `delta_sync_queue` table with `{user_id, asin, delta, reference_id, notes, status='pending'}`.
3. A scheduled edge function (`delta-sync-push`, runs every 1 min via cron) drains the queue per user: groups up to 500 pending rows → POSTs to the user's endpoint → marks rows `sent` with `balance_after`, or `failed` with error message; respects 60 req/min.

### Manual reconcile
- "Reconcile Now" calls the same edge function with `mode=manual` for the current user; bypasses the cron wait.

### Auto-push toggle OFF
- The trigger still queues rows (so nothing is lost if the user re-enables) but the cron skips them. Pending count is shown so the user can flush manually.

## Database (migrations)

1. **`delta_sync_config`** (per user)
   - `user_id` (unique), `base_url`, `api_key` (text, RLS-protected), `source_label`, `auto_push_enabled` (bool), `last_pushed_at`, `last_test_status`
   - RLS: only owner can select/update/insert.

2. **`delta_sync_queue`**
   - `id`, `user_id`, `asin`, `delta` (int), `reference_id` (nullable), `notes` (nullable), `status` (`pending|sent|failed|skipped`), `balance_after` (nullable), `error_message` (nullable), `created_at`, `pushed_at`
   - Index on `(user_id, status, created_at)`.
   - RLS: owner read-only; edge function (service role) writes.

3. **Trigger** on `stock_changes` insert → enqueue into `delta_sync_queue` (only when a `delta_sync_config` row exists for the user; computes delta as `new_quantity - old_quantity` if not already a delta column).

## Edge Function — `delta-sync-push`

- Auth: accepts user JWT (manual mode) OR runs as service role from cron (no JWT).
- Logic: load each user's `delta_sync_config` (where `api_key` not null). If `mode=manual`, scope to caller's user_id. For each user:
  - Pull up to 500 `pending` rows ordered by `created_at`.
  - POST to `{base_url}/api/public/sync/stock` with `{source, items}`.
  - On 200: mark rows `sent` with `balance_after` from `results`; rows in `skipped[]` marked `skipped`.
  - On 401/403: mark rows `failed`, set `last_test_status='invalid_key'`, stop.
  - On 429: backoff, retry once, otherwise leave pending.
  - On 400: mark batch `failed` with the validation error.
- Updates `last_pushed_at` on success.
- Schedule via `pg_cron` every 60s (added in migration alongside the table).

## Files

**New**
- `src/components/external-sync/DeltaSyncSettings.tsx`
- `src/components/external-sync/DeltaSyncDashboard.tsx`
- `supabase/functions/delta-sync-push/index.ts`

**Edited**
- `src/pages/ShopifySyncPage.tsx` — render the two new cards in the App Sync tab.
- `supabase/config.toml` — register `delta-sync-push` (verify_jwt = false; auth handled in code).

**Migrations** — `delta_sync_config` table + RLS, `delta_sync_queue` table + RLS, `stock_changes` AFTER INSERT trigger, `pg_cron` schedule for `delta-sync-push`.

## Out of scope

- No changes to the existing huha sync (`external-app-sync` function or its UI).
- No changes to ASIN inventory mutation logic itself — we hook the existing `stock_changes` ledger.
- No multi-destination fan-out (this is the second of two; if a third is needed later, generalize then).
