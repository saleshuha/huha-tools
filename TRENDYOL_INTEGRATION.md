# Trendyol Saudi Arabia

## Account and security

Seller **1360871**, Saudi local seller, production host `https://apigw.trendyol.com`. A read-only Saudi order call and category/brand calls accepted the supplied credentials. This confirms read access, not successful product approval or shipment operations.

Credentials are encrypted Supabase secrets `TRENDYOL_API_KEY` and `TRENDYOL_API_SECRET`. The server uses Basic authentication (`API key:API secret`), `storeFrontCode: SA`, `User-Agent: 1360871 - SelfIntegration`, and English catalog requests. Only authenticated administrators can invoke the integration. No provider credentials are sent to the browser.

## Products

Open **Shopify Sync → Trendyol SA**. Test connection, refresh Saudi stock, and map products. Each mapping links an ASIN to the internal SKU and the Trendyol barcode. Barcodes, not SKUs or ASINs, identify price/stock updates and order lines on Trendyol.

Provide product title, description, model code, Saudi brand/category IDs, sale/list price, VAT, HTTPS images and category attributes. Fetch Saudi category attributes and values before publishing. The seller must ensure images meet Trendyol's specified 1200×1800 format and commercial/legal requirements. VAT defaults to 15%; confirm it for each product. Costs are not modified.

Select products → **Create products**. Up to 1,000 products per request. HTTP acceptance is asynchronous: **History → Check batch** shows processing failures. **Check approval** reads Trendyol's product approval separately. Approved products can then use stock-only, price-only or combined sync.

Available stock sums active `KSA` inventory rows with status `in-stock`, across serial/bin rows sharing normalized ASIN. Reserved/damaged/disabled/non-Saudi stock is excluded. SKU and ASIN normalization uses uppercase/trim. Serial numbers remain unchanged. Missing/disabled inventory blocks a push rather than silently using a stale quantity.

## Orders and fulfillment

Choose an order date within the past 90 days and import. All remote pages are fetched, 200 packages per page. Imports update the same package rather than duplicating it; existing fulfillment fields remain intact.

**Fulfill** refreshes the package from Trendyol, rejects canceled/stale packages, then runs a database transaction. The transaction locks inventory, requires active barcode mappings and enough Saudi stock for every line, deducts from individual inventory rows and writes `stock_changes`. If any line fails, everything rolls back. A per-package lock prevents replay and a fulfilled-line ledger prevents a split/replayed line from deducting again.

After local deduction the server sends **Picking**. Network failure does not deduct stock again: **Retry Picking** retries only the remote notification. Add your real invoice number to send **Invoiced** after Picking; add tracking number and a Trendyol carrier provider code for tracking.

Local fulfillment and Trendyol notification cannot be one cross-service transaction. Inspect warnings/history when a remote notification fails. Cancellation after fulfillment, returns and stock restoration require a separately reviewed reversal workflow; this integration never automatically adds stock back.

## API contract

Frontend calls `POST {Supabase URL}/functions/v1/trendyol` with its user Bearer session and publishable key. Supported actions: `test-connection`, `inventory`, `catalog`, `publish`, `approval`, `sync`, `batch`, `import-orders`, `fulfill`, `invoice`, `tracking`. Inputs are server-validated. Provider failures retain their HTTP status and details, with credentials redacted.

Provider endpoints:

- Create: `POST /integration/product/sellers/1360871/v2/products`
- Stock/price: `POST /integration/inventory/sellers/1360871/products/price-and-inventory`
- Batch: `GET /integration/product/sellers/1360871/products/batch-requests/{batchId}`
- Approval: `GET /integration/product/sellers/1360871/product/{barcode}`
- Orders: `GET /integration/order/sellers/1360871/orders`
- Picking/invoice: `PUT /integration/order/sellers/1360871/shipment-packages/{packageId}`
- Tracking: `PUT /integration/order/sellers/1360871/shipment-packages/{packageId}/tracking-details`, body `{ cargoSenderNumber, providerCode }`

## Operation and verification limits

Sync and order imports are manual controls, not an unattended scheduler. Fulfillment is explicitly confirmed, never automatic. No product was published and no live order/stock was changed during setup. The verified seller account currently returned zero orders. Browser authenticated checks are unavailable on this external Supabase project; sign in to exercise the workspace with real product data. Five domain tests cover normalization, sellable stock aggregation, serial-row allocation, shortage rollback planning and repeated-line stock accounting. Remote product publication/approval and real order fulfillment remain unverified until exercised with approved seller data.