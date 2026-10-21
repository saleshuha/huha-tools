# Trendyol Saudi Arabia

## Account and security

Seller **1360871**, Saudi local seller, production host `https://apigw.trendyol.com`. A read-only Saudi order call and category/brand calls accepted the supplied credentials. This confirms read access, not successful product approval or shipment operations.

Credentials are encrypted Supabase secrets `TRENDYOL_API_KEY` and `TRENDYOL_API_SECRET`. The server uses Basic authentication (`API key:API secret`), `storeFrontCode: SA`, `User-Agent: 1360871 - SelfIntegration`, and English catalog requests. Only authenticated administrators can invoke the integration. No provider credentials are sent to the browser.

## Products

Open **Trendyol SA** from the sidebar. Test connection, refresh Saudi stock, and map products. Each mapping links an ASIN to the internal SKU and the Trendyol barcode. Barcodes, not SKUs or ASINs, identify price/stock updates and order lines on Trendyol.

Provide product title, description, model code, Saudi brand/category IDs, sale/list price, VAT, HTTPS images and category attributes. Fetch Saudi category attributes and values before publishing. The seller must ensure images meet Trendyol's specified 1200×1800 format and commercial/legal requirements. VAT defaults to 15%; confirm it for each product. Costs are not modified.

Select products → **Create products**. Up to 1,000 products per request. HTTP acceptance is asynchronous: **History → Check batch** shows processing failures. **Check approval** reads Trendyol's product approval separately. Approved products can then use stock-only, price-only or combined sync.

Available stock sums active `KSA` inventory rows with status `in-stock`, across serial/bin rows sharing normalized ASIN. Reserved/damaged/disabled/non-Saudi stock is excluded. SKU and ASIN normalization uses uppercase/trim. Serial numbers remain unchanged. Missing/disabled inventory blocks a push rather than silently using a stale quantity.

## Amazon price reference and formula

**Amazon pricing** shows confirmed inventory mappings, saved Amazon Buy Box prices, lookup timestamps, current Trendyol prices and calculated previews. Select rows (50 per page) and choose **Fetch Amazon prices**. Lookups are sequential, deduplicated by normalized ASIN, and saved immediately; Stop completes the current request first. Reloading the page reads saved data without spending new credits. A new lookup replaces the previous reference; missing products/prices become unavailable rather than silently reusing an old value.

The encrypted `ASIN_SPOTLIGHT_API_KEY` is used only server-side with `x-api-key` at `GET https://api.asinspotlight.com/v1/product?asin={ASIN}&marketplace=sa`. `data.bb_price` is the numeric Buy Box price. The Saudi marketplace's local price is treated as SAR; the provider response has no currency field. Coupons and delivery charges are not applied. Each successful lookup, including `found:false`, consumes one subscription request credit. Provider 429 stops further lookups; 401/403 indicates credential/access failure. Failed requests do not overwrite a saved price.

Save separate original-price and sale-price formulas, each with a signed percentage and signed fixed SAR adjustment: `round(Amazon price × (1 + percentage/100) + fixed SAR, 2)`. For example, Amazon 100 SAR with original +40% and +10 SAR gives original 150 SAR; sale +20% and +5 SAR gives sale 125 SAR. Both results must be positive and original must be at least sale; invalid pairs block submission, without silently raising the original price. Existing sale formulas are preserved and copied into the initial original formula. Formula saving and price fetching never update Trendyol.

**Submit preview prices → Confirm submission** sends both calculated prices for selected enabled, approved mappings. The server recalculates from saved Amazon prices and both saved formulas and rejects either changed preview. Requests contain `salePrice` and `listPrice` (original price), not quantity. Submissions are batched by 100 and recorded in History; HTTP acceptance is not completed marketplace processing. Use **Check batch** to verify results. Cached references have no automatic expiry: review their timestamps and refresh before submitting when needed.

**Fetch selected prices** refreshes the chosen products. **Fetch all Amazon prices → Confirm fetch all** refreshes every unique ASIN in the mapped-products pricing workspace, across all pages and regardless of search or selection. The confirmation displays the lookup count and credit cost. Progress and Stop after current remain available; completed lookups persist even when a later lookup fails. It never sends prices to Trendyol.

Storage: `trendyol_amazon_prices` holds per-administrator normalized ASIN references; `trendyol_pricing_settings` holds their formula. Lookup writes are server-only; administrator reads and settings writes are restricted to their own records. New actions are `amazon-price` and `pricing-submit`.

## Orders and fulfillment

Choose an order date within the past 90 days and import. All remote pages are fetched, 200 packages per page. Imports update the same package rather than duplicating it; existing fulfillment fields remain intact.

**Fulfill** refreshes the package from Trendyol, rejects canceled/stale packages, then runs a database transaction. The transaction locks inventory, requires active barcode mappings and enough Saudi stock for every line, deducts from individual inventory rows and writes `stock_changes`. If any line fails, everything rolls back. A per-package lock prevents replay and a fulfilled-line ledger prevents a split/replayed line from deducting again.

After local deduction the server sends **Picking**. Network failure does not deduct stock again: **Retry Picking** retries only the remote notification. Add your real invoice number to send **Invoiced** after Picking; add tracking number and a Trendyol carrier provider code for tracking.

Local fulfillment and Trendyol notification cannot be one cross-service transaction. Inspect warnings/history when a remote notification fails. Cancellation after fulfillment, returns and stock restoration require a separately reviewed reversal workflow; this integration never automatically adds stock back.

## API contract

Frontend calls `POST {Supabase URL}/functions/v1/trendyol` with its user Bearer session and publishable key. Supported actions: `test-connection`, `inventory`, `catalog`, `publish`, `approval`, `sync`, `batch`, `import-orders`, `fulfill`, `invoice`, `tracking`. Inputs are server-validated. Provider failures retain their HTTP status and details, with credentials redacted.

Provider endpoints:

- List: `GET /integration/product/sellers/1360871/products/approved` and `.../products/unapproved` (Product v2; the legacy listing endpoint was retired with HTTP 426)
- Create: `POST /integration/product/sellers/1360871/v2/products`
- Stock/price: `POST /integration/inventory/sellers/1360871/products/price-and-inventory`
- Batch: `GET /integration/product/sellers/1360871/products/batch-requests/{batchId}`
- Approval: `GET /integration/product/sellers/1360871/product/{barcode}`
- Orders: `GET /integration/order/sellers/1360871/orders`
- Picking/invoice: `PUT /integration/order/sellers/1360871/shipment-packages/{packageId}`
- Tracking: `PUT /integration/order/sellers/1360871/shipment-packages/{packageId}/tracking-details`, body `{ cargoSenderNumber, providerCode }`

## Operation and verification limits

Sync and order imports are manual controls, not an unattended scheduler. Fulfillment is explicitly confirmed, never automatic. No product was published and no live order/stock was changed during setup. The verified seller account currently returned zero orders. Browser authenticated checks are unavailable on this external Supabase project; sign in to exercise the workspace with real product data. Five domain tests cover normalization, sellable stock aggregation, serial-row allocation, shortage rollback planning and repeated-line stock accounting. Remote product publication/approval and real order fulfillment remain unverified until exercised with approved seller data.