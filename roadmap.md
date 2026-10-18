# Trendyol Saudi integration

- [ ] Explain blocked single/selected price submissions, refresh approval from the pricing tab, and confirm bulk submission of all eligible mapped prices.

- [x] Separate pending/fetched/all-item views and pending-only fetching from explicit refresh-all; reuse saved completed lookups by default in the service to prevent repeat credit usage.

- [x] Improve Amazon price-fetch throughput with two concurrent lookups, targeted inventory reads, indexed price matching, progress and safe resume. Queue tests verify concurrency, stop, rate limits and isolated errors. Deployed; authenticated live speed check remains unavailable with external Supabase.

- [x] Add separate saved original-price and sale-price formulas, preview both and submit both to Trendyol; original-below-sale is blocked. Deployed, schema verified and nine pricing/matching tests passed.
- [x] Add Fetch all Amazon prices across all mapped products, independent of selection and pagination, with credit confirmation, progress and stop; lookup scope test passed.

- [x] Connect ASIN Spotlight, save Amazon Saudi ASIN prices, and add a saved percentage-plus-fixed pricing formula with preview and explicit Trendyol price submission. Six pricing/matching tests passed; live Amazon.sa lookup returned 21 SAR. Function deployed; signed-in persistence/submission checks remain blocked by external authentication.

- [x] Add matched, inventory-only and Trendyol-only product views, persistent mapping and a separate mapped-products price/stock workspace; three matching tests and desktop/mobile comparison-control checks passed.

- [x] Verify Saudi seller API, product requirements and shipment workflow.
- [x] Connect Trendyol credentials through existing Supabase; Saudi orders/categories/brands read access returned HTTP 200.
- [x] Add product mapping, V2 creation, approval checks, price and sellable-stock manual synchronization.
- [x] Add paginated order import and transactional local fulfillment, stock history, package/line replay guards, Picking/invoice/tracking notifications.
- [x] Add batch history, error details, retry Picking, mapping settings and integration documentation.
- [x] Run five stock-domain tests, deploy the function and verify the app compiles; public browser redirects to sign-in without errors.
- [ ] Verify authenticated workspace and actual product creation/approval, price/stock push and order fulfillment. Blockers: external Supabase does not supply a test browser session; seller currently has zero orders; no real product mapping/approval supplied. No live marketplace writes were made.