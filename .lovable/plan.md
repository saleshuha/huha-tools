# App Sync Connection — Method, Documentation & What the Other App Provides

## Goal

Make the "Us → them" connection to another Lovable app clear and working: define the **one** method we use, document the API the other app must implement, and state exactly what the other app must give us.

## Current state (confirmed by reading the code)

The App Sync tab has **two** overlapping outbound syncs:

1. **Full Product Sync** (`external-app-sync` edge function) — pushes complete product data (name, ASIN, SKU, qty, images) one product at a time to the other app's `product-sync` endpoint. Auth = shared `EXTERNAL_APP_SYNC_KEY` Bearer token. Currently failing "Unauthorized".
2. **Delta Stock Sync** (`delta-sync-push` edge function) — pushes ASIN quantity deltas to the other app's `/api/public/sync/stock`. Auth = `sp_live_...` Bearer key stored per-user. 2,171 deltas stuck pending (no key saved).

Both need the other app to expose an endpoint. The delta method is the cleaner one (the spec you already shared: `{ source, items: [{ asin, delta, reference_id?, notes? }] }`).

## The connection model (Us → them only)

```text
  THIS APP (huha-tools)                     OTHER LOVABLE APP
  ─────────────────────                    ─────────────────────
  stock_changes trigger                      POST /api/public/sync/stock
        │                                     ▲
        ▼                                     │
  delta_sync_queue  ──► delta-sync-push ──────┘
  (pending rows)       edge function        receives { source, items }
                       (Bearer sp_live_…)   applies deltas, returns
                                            { applied, skipped, results }
```

- **Method:** HTTPS `POST` with JSON body + `Authorization: Bearer <key>` header.
- **What we send:** `{ source: "<label>", items: [{ asin, delta, reference_id?, notes? }] }` — up to 500 items per request.
- **What the other app returns:** `{ applied, skipped: [{ asin, reason }], results: [{ asin, delta, balance_after }] }`.
- **Auth on our side:** the `delta_sync_config.api_key` (the `sp_live_...` key the other app gives us). We never expose our Supabase service key to them.

## What the other app must provide us (2 things)

1. **Base URL** — e.g. `https://<their-project>.lovableproject.com` (we POST to `{base}/api/public/sync/stock`).
2. **API Key** — a `sp_live_...` Bearer token they generate in their app's dashboard and hand to us. We store it in the Delta Sync Settings card.

## Our documentation (the spec the other app implements)

This is the contract the other Lovable app must build against. We will surface it in a "Connection Guide" card in the App Sync tab:

### Request
```
POST {base}/api/public/sync/stock
Authorization: Bearer sp_live_<KEY>
Content-Type: application/json

{
  "source": "huha-tools",                 // <= 80 chars, labels the calling app
  "items": [                              // 1–500 items
    { "asin": "B0FH7QHV5N", "delta": -2, "reference_id": "order-123", "notes": "sale" },
    { "asin": "B0XYZ00001", "delta": 10 }
  ]
}
```
- `delta`: integer, −10000 to +10000. Positive = restock, negative = sale/consumption.

### Response 200
```json
{
  "applied": 1,
  "skipped": [{ "asin": "B0XYZ00001", "reason": "asin_not_found" }],
  "results": [{ "asin": "B0FH7QHV5N", "delta": -2, "balance_after": 46 }]
}
```

### Errors
- `401 missing_key / invalid_key` — bad or missing Authorization header.
- `403 revoked_key` — key revoked in their dashboard.
- `400 invalid_body` — schema validation failed.
- `429 rate_limited` — over 60 requests/min for the same key.

## Changes to build

### 1. Add a "Connection Guide" card to the App Sync tab
- A new `ConnectionGuideCard` component shown at the top of the App Sync tab.
- Plain-language explanation: method (HTTPS POST + Bearer), the two things the other app gives us (Base URL + API key), and a collapsible "API specification" section with the request/response/error format above.
- A "Copy" button for the example request so you can paste it to the other app's developer.

### 2. Consolidate to the delta method as the primary connection
- Keep **Delta Stock Sync** as the canonical "Us → them" connection.
- Mark the **Full Product Sync** card as "Legacy / optional" with a note that it requires the other app to run a separate `product-sync` edge function and a shared key — only use it if you also need full product catalog push (name, images, SKU). Do not remove it; just label it so it's not confusing.

### 3. Fix the 2,171 stuck deltas
- The deltas are pending because no API key is saved. Once a valid key + base URL is saved and "Test Connection" passes, "Push Now" flushes the queue. No code change needed — this is configuration, but I'll verify the push path works end-to-end after the key is set.

## No changes
- `delta-sync-push` edge function already implements the spec correctly (validates 401/403/429, marks rows sent/skipped/failed, records `balance_after`).
- `delta_sync_queue` trigger already enqueues from `stock_changes` automatically.
- Database schema is already correct.

## Files
- **New:** `src/components/external-sync/ConnectionGuideCard.tsx` — the documentation card.
- **Edit:** `src/pages/ShopifySyncPage.tsx` — render `ConnectionGuideCard` at the top of the `app-sync` tab.
- **Edit:** `src/components/external-sync/ExternalSyncSettings.tsx` — add "Legacy / optional" label to the Full Product Sync card header.
