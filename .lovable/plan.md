

## Plan: Redesign Purchase Links Tab + Separate Invoice System (SAR Currency)

### Problem
1. The Purchase Links management UI is dense and hard to scan — each card has too much inline data
2. Invoicing is tightly coupled to purchase links (must click "Invoice" on a link card)
3. Currency is hardcoded as `$` instead of SAR

### Changes

#### 1. Redesign PurchaseLinkManagement Cards (Cleaner Layout)
**File: `src/components/po/PurchaseLinkManagement.tsx`**

- Restructure cards into a cleaner 2-section layout:
  - **Top row**: Title + status badge + action buttons (compact row)
  - **Bottom row**: Inline compact stats as pill badges (Views, Updates, POs, Created) instead of large grid blocks
- Move progress bar + stats into a collapsible section (expand on click)
- Move PO badges into the collapsible section too
- Remove the per-card "Invoice" button (invoicing moves to its own section)
- Keep timestamps (accessed/expires) as subtle footer text

#### 2. Separate Invoice Management System
**File: `src/components/po/PurchaseInvoiceList.tsx`** (major rewrite)

- Add a "Create Invoice" button at the top of the invoice list
- New invoice creation dialog that is **independent** of purchase links:
  - Supplier dropdown (from `suppliers` table) instead of text input
  - Manual item entry: ASIN, SKU, Title, Qty, Unit Cost (SAR)
  - Option to import items from a purchase link (optional helper, not required)
  - Invoice number auto-generated
  - Currency displayed as SAR throughout
- Invoice list cards show SAR currency

#### 3. Currency → SAR (All Invoice Components)
**Files: `PurchaseInvoiceGenerator.tsx`, `PurchaseInvoiceList.tsx`**

- Replace all `$` with `SAR` in:
  - PDF generation (`buildInvoicePDF`)
  - Invoice preview dialog
  - Invoice list cards
- Format: `123.45 SAR` (suffix style)

#### 4. Tab Layout Update
**File: `src/components/POTracker.tsx`** (line ~7278)

- Split the "purchase-links" tab content into two clear sections with headers:
  - Section 1: **Purchase Links** (PurchaseLinkManagement + PurchaseUpdatesPanel)
  - Section 2: **Invoices** (PurchaseInvoiceList with standalone creation)
- Or use sub-tabs within the purchase-links tab

### Technical Details

- Supplier dropdown will query `suppliers` table directly using `supabase.from('suppliers').select('id, supplier_name')` 
- The `purchase_invoices` table already has `link_id` as nullable, so standalone invoices (no link) are already supported
- No DB migration needed — existing schema supports all changes
- The `buildInvoicePDF` function will be updated to use SAR currency formatting

### Files Modified
- `src/components/po/PurchaseLinkManagement.tsx` — cleaner card layout, remove invoice button
- `src/components/po/PurchaseInvoiceList.tsx` — standalone invoice creation + SAR currency
- `src/components/po/PurchaseInvoiceGenerator.tsx` — SAR currency in PDF + preview
- `src/components/POTracker.tsx` — section layout update

