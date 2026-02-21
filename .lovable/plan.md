

## Market Purchases — Order File Integration, Market Purchase Links, and Cost Management

This plan adds three major capabilities to the Market Purchases module:

### 1. Daily Orders Tab — Auto-Import from DF and Noon Files

A new **"Daily Orders"** tab that pulls items directly from your already-uploaded Amazon DF files (`order_imports` table) and Noon B2B files (`noon_processing_orders` table), consolidated by ASIN with quantities aggregated. This eliminates manual entry for daily orders.

**How it works:**
- Select a date (defaults to today)
- System queries `order_imports` (Amazon DF) and `noon_processing_orders` (Noon B2B) for that date
- Groups items by ASIN/SKU, sums quantities, tags platform automatically
- Shows a consolidated list: ASIN, SKU, Title, Amazon Qty, Noon Qty, Total Qty, Unit Cost (from saved costs)
- One-click "Log as Purchase" converts the daily list into a market purchase entry (with supplier selection)
- Or "Generate Purchase Link" to share with supplier (simpler version — no scanning needed)

### 2. Market Purchase Links — Simplified Supplier Sharing

A lighter version of PO purchase links, tailored for market purchases:

**New table: `market_purchase_links`**
```
id, link_token, user_id, purchase_id (nullable), title, 
supplier_id, platform, items (jsonb — array of {asin, sku, title, qty, unit_cost}),
is_active, expires_at, created_at
```

**New public page: `/market-purchase/:token`**
- Shows the item list (ASIN, SKU, Title, Qty needed)
- Supplier can enter/update: supplier name, unit cost per item
- No barcode scanning — just a simple list with cost input fields
- "Submit" saves costs back to the system
- Costs auto-saved to `market_item_costs` table

### 3. Item Cost Management — New "Costs" Tab

A new **"Item Costs"** tab under Market Purchases for managing saved costs:

**New table: `market_item_costs`**
```
id, user_id, asin, sku, title, unit_cost, supplier_name, 
source (manual/purchase_link/purchase_log), updated_at, created_at
```

**Features:**
- **View all saved costs** — searchable table of ASIN/SKU with their latest unit cost
- **Manual cost upload** — "Add Cost" button to manually enter ASIN + unit cost
- **Bulk CSV upload** — Upload a CSV with columns: ASIN, SKU, Unit Cost to bulk-set prices
- **Auto-population** — When logging a purchase or using a purchase link, costs are saved/updated here automatically
- **Cost lookup** — The Daily Orders tab and New Purchase dialog auto-fill unit cost from this table

### Data Flow

```text
[Upload DF File (Amazon)]  →  order_imports table
[Upload Noon B2B File]     →  noon_processing_orders table
              ↓
[Daily Orders Tab]  →  Consolidated by ASIN + date
              ↓
[Log Purchase]  OR  [Generate Market Link]
      ↓                       ↓
market_purchases        market_purchase_links
market_purchase_items         ↓
      ↓              [Supplier enters costs]
      ↓                       ↓
      └──────→ market_item_costs ←──────┘
              (central cost store)
```

---

### Technical Details

**Database changes (2 new tables):**

1. **`market_item_costs`** — Central cost store
   - `id` uuid PK, `user_id` uuid, `asin` text, `sku` text, `title` text
   - `unit_cost` numeric, `supplier_name` text
   - `source` text (manual/link/purchase), `updated_at`, `created_at`
   - Unique constraint on (user_id, asin) — upsert on conflict
   - RLS: user_id = auth.uid()

2. **`market_purchase_links`** — Shareable purchase lists
   - `id` uuid PK, `link_token` text unique, `user_id` uuid
   - `purchase_id` uuid nullable FK, `title` text, `supplier_id` uuid nullable
   - `platform` text, `items` jsonb, `is_active` boolean default true
   - `expires_at` timestamptz, `created_at`, `updated_at`
   - RLS: user_id = auth.uid() for admin, public SELECT by link_token

**New files to create:**

1. `src/components/market-purchases/DailyOrdersTab.tsx` — Consolidated daily orders from DF + Noon
2. `src/components/market-purchases/ItemCostsTab.tsx` — Cost management with manual entry + CSV upload
3. `src/components/market-purchases/AddCostDialog.tsx` — Manual single-item cost entry
4. `src/components/market-purchases/BulkCostUploadDialog.tsx` — CSV upload for bulk costs
5. `src/components/market-purchases/GenerateMarketLinkDialog.tsx` — Generate shareable link from daily orders
6. `src/pages/MarketPurchasePublic.tsx` — Public page for supplier to view items + enter costs
7. `src/hooks/useMarketItemCosts.ts` — CRUD for market_item_costs
8. `src/hooks/useMarketPurchaseLinks.ts` — CRUD for market_purchase_links
9. `supabase/functions/market-link-handler/index.ts` — Edge function for public link data

**Files to modify:**

10. `src/pages/MarketPurchases.tsx` — Add 2 new tabs: "Daily Orders" and "Item Costs"
11. `src/components/market-purchases/NewPurchaseDialog.tsx` — Auto-fill unit_cost from market_item_costs
12. `src/App.tsx` — Add public route `/market-purchase/:token`

---

### UI Changes to Market Purchases Page

The tab bar expands from 3 to 5 tabs:

| Tab | Purpose |
|-----|---------|
| Daily Orders (NEW) | See today's Amazon DF + Noon orders consolidated, generate links |
| Purchase Log | Existing — manual purchase logging |
| Item Costs (NEW) | Manage saved costs, manual entry, CSV upload |
| Credit Balances | Existing — supplier debt tracking |
| Bill Reconciliation | Existing — match supplier bills |

### Daily Orders Tab Layout

- Date picker at top (default: today)
- Two summary cards: "Amazon Orders: X items" and "Noon Orders: X items"
- Consolidated table: ASIN, SKU, Title, AMZ Qty, Noon Qty, Total, Unit Cost (auto-filled or editable), Line Total
- Action buttons: "Log as Market Purchase" (saves to purchase log with supplier selection) and "Generate Purchase Link" (creates a sharable link)

### Item Costs Tab Layout

- Toolbar: "Add Cost" button + "Upload CSV" button + search bar
- Table: ASIN, SKU, Title, Unit Cost, Supplier, Source (manual/link/purchase), Last Updated
- Inline edit for unit cost
- CSV upload accepts: ASIN, SKU (optional), Unit Cost columns

