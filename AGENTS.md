# Project architecture

- Trendyol uses server-side production credentials and verified administrator sessions; never send marketplace credentials to the browser.
- Trendyol stock-only sends use a protected versioned outbox, a global worker lease and capabilityless wake endpoint; inventory triggers enqueue latest Saudi sellable totals, batch completion precedes newer sends, and temporary retry scheduling ends after drain so closed browsers do not interrupt sync.
- Manual stock pushes immediately wake the existing leased worker and monitor captured queue versions until provider confirmation; never bypass the outbox or report enqueueing as completion.
- Bound stock-worker UUID filters and per-pass writes to small batches to avoid PostgREST URL limits; persist stage-specific interruptions so retries are not mistaken for provider progress.
- Trendyol direct fetch requests must share the Supabase client's exported URL and publishable key; build-time environment variables may be absent in this external-Supabase project.
- Keep shared Trendyol provider requests and stock calculations under functions/_shared/trendyol so both services deploy with consistent Saudi headers and credential redaction.
- Trendyol fulfillment is a service-role-only transactional RPC with package locking and idempotency; external shipment notifications retry separately without deducting stock twice.
- Preserve fulfilled order-line identity in a server-only ledger to reject replays after remote package splitting; reject the whole transaction on any shortage or replay.
- Host Trendyol on its dedicated /trendyol-sa page with separate sidebar navigation; reuse its isolated API client and workspace to preserve Shopify behavior.
- Derive Trendyol comparison groups from normalized inventory ASINs and unique exact SKU/barcode matches; persist confirmed links by changing only the product's ASIN so remote identity and inventory stock stay intact.
- Keep product matching and paginated comparison tables separate from the Trendyol workspace; allow marketplace price/stock submissions only from confirmed inventory mappings.
- Keep Amazon pricing calculations in a shared pure module and validate cached prices server-side before explicit submission so previews and marketplace prices agree; ASIN Spotlight credentials remain server-only.
- Run Amazon lookups through a bounded two-worker queue without automatic billable retries, drain active requests on stop and validate only matching inventory rows server-side; pending fetching reuses persisted lookups server-side unless an explicit refresh is requested, avoiding repeated charges.