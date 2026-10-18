# Project architecture

- Trendyol uses server-side production credentials and verified administrator sessions; never send marketplace credentials to the browser.
- Trendyol direct fetch requests must share the Supabase client's exported URL and publishable key; build-time environment variables may be absent in this external-Supabase project.
- Keep Trendyol provider requests in its connection module so Saudi headers and credential redaction remain consistent.
- Trendyol fulfillment is a service-role-only transactional RPC with package locking and idempotency; external shipment notifications retry separately without deducting stock twice.
- Preserve fulfilled order-line identity in a server-only ledger to reject replays after remote package splitting; reject the whole transaction on any shortage or replay.
- Host Trendyol on its dedicated /trendyol-sa page with separate sidebar navigation; reuse its isolated API client and workspace to preserve Shopify behavior.
- Derive Trendyol comparison groups from normalized inventory ASINs and unique exact SKU/barcode matches; persist confirmed links by changing only the product's ASIN so remote identity and inventory stock stay intact.
- Keep product matching and paginated comparison tables separate from the Trendyol workspace; allow marketplace price/stock submissions only from confirmed inventory mappings.