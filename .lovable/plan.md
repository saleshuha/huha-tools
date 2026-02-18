

## Supplier Cost Tracking, Cost History, and Purchase Invoice System

This feature adds three interconnected capabilities to the Purchase Links system:

### 1. Supplier and Product Cost Input (via Purchase Link Portal)

Currently, the vendor portal (public `/purchase/:token` page) only has "Scan (Done)" and "N/A" buttons -- no way to enter supplier name or unit cost. We will add:

- A **supplier info bar** at the top of the purchase link page where the vendor enters their name and supplier order number once per session (stored in state, auto-applied to all items they mark as done)
- A **unit cost input** on each product card so the vendor can type the per-unit cost when marking items as done
- The cost data gets saved to the existing `purchase_updates` table columns (`supplier_name`, `supplier_order_number`, `unit_cost`, `total_cost`) which already exist but are unused

### 2. ASIN Cost History Table (New Tab in PO Tracker)

A new **"Cost History"** tab in the PO Tracker page showing:

- A table of all unique ASINs that have been purchased through purchase links
- Product image column
- ASIN / SKU column
- Title column
- **10 date columns** showing the unit cost recorded on different purchase sessions/dates, allowing you to track cost changes over time
- Supplier name per entry
- The data comes from `purchase_updates` grouped by ASIN and ordered by date

**Database**: New table `asin_cost_history` to store cost snapshots:
- `id`, `asin`, `sku_code`, `title`, `unit_cost`, `supplier_name`, `link_id`, `recorded_date`, `created_at`
- Populated automatically via a trigger on `purchase_updates` when `unit_cost` is set

### 3. Purchase Invoice / Proforma Invoice Generator

A new **"Invoices"** section accessible from the Purchase Links management tab:

- **Generate Invoice** button on each purchase link card
- Creates a proforma-style invoice document containing:
  - Supplier name and order number (from purchase updates)
  - Date of purchase session
  - Table of all items: ASIN, SKU, Title, Quantity, Unit Cost, Total Cost
  - Grand total at the bottom
  - Link reference number
- **Invoice History**: Each generated invoice is stored in a new `purchase_invoices` table
- **Export to PDF** using the existing jsPDF dependency
- **Verification view**: Side-by-side comparison showing "Our Records" vs "Supplier Invoice" to verify costs match

### Technical Details

**Database Changes (3 migrations):**

1. **`asin_cost_history` table**:
   ```text
   id (UUID PK)
   asin (TEXT)
   sku_code (TEXT)
   title (TEXT)
   unit_cost (DECIMAL)
   supplier_name (TEXT)
   link_id (UUID FK -> purchase_links)
   po_number (TEXT)
   recorded_date (DATE)
   user_id (UUID)
   created_at (TIMESTAMPTZ)
   ```
   - RLS: authenticated users can read/write their own records
   - Trigger on `purchase_updates`: when `unit_cost` is inserted/updated and is not null, upsert into `asin_cost_history`

2. **`purchase_invoices` table**:
   ```text
   id (UUID PK)
   link_id (UUID FK -> purchase_links)
   invoice_number (TEXT, auto-generated)
   supplier_name (TEXT)
   supplier_order_number (TEXT)
   invoice_date (DATE)
   items (JSONB - array of line items)
   subtotal (DECIMAL)
   total (DECIMAL)
   notes (TEXT)
   user_id (UUID)
   status (TEXT - draft/finalized)
   created_at, updated_at (TIMESTAMPTZ)
   ```
   - RLS: authenticated users can manage their own invoices

**Frontend Changes:**

1. **`src/pages/PurchaseLink.tsx`** - Add supplier info bar and unit cost input per card
2. **`src/components/po/AsinCostHistory.tsx`** (new) - Cost history table with ASIN images and 10 date columns
3. **`src/components/po/PurchaseInvoiceGenerator.tsx`** (new) - Invoice generation and PDF export
4. **`src/components/po/PurchaseInvoiceList.tsx`** (new) - List of generated invoices
5. **`src/components/POTracker.tsx`** - Add "Cost History" tab and "Invoices" sub-section to the Links tab

**Edge Function Update:**

- **`purchase-link-handler/index.ts`** - Update the `/update/:token` handler to also insert into `asin_cost_history` when `unit_cost` is provided

**File count**: 2 database migrations, 3 new components, 3 modified files, 1 edge function update

