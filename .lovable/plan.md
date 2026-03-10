

# Purchase Link Page Redesign

## Changes

### 1. Currency: $ → SAR
Replace all `$` references with `SAR` throughout the page (unit cost display, total cost calculation).

### 2. Supplier Info: Session-level → Per-product
- Remove the global supplier info collapsible bar (lines 575-613)
- Remove `supplierName` and `supplierOrderNumber` state variables from the top level
- Add per-item supplier fields directly into each product card — a compact inline row with two small inputs (Supplier Name + Order #) that appears only for pending/partial items
- Update `handleSaveGroup` to read supplier info from per-item state (`itemSuppliers` Map) instead of global state

### 3. UI Redesign — Clean, Mobile-First Layout

**Header**: Simplify the collapsible metrics — always show a compact progress bar with percentage + key counts inline. Remove the large SVG ring chart. Keep stats as small inline pills.

**Search & Filters**: 
- Merge dual search into a single unified search input (searches SKU, ASIN, PO, and title together)
- Status filter tabs as horizontal pill buttons always visible (no collapsible), compact `h-8`
- Sort buttons inline with filters

**Product Cards — Complete Redesign**:
- Mobile: Full-width stacked layout with clear visual sections
- Top: Status indicator dot + Product title (2 lines max) + image thumbnail (tap to expand)
- Middle: Identifier badges row (ASIN, SKU, PO numbers) — horizontal scroll on mobile
- Bottom section with clear separation:
  - Left: Required qty badge
  - Right: Action buttons (Scan Done / N/A)
- Per-item supplier inputs + unit cost input in a compact row below actions
- Remove checkbox selection for cleaner mobile UX — keep bulk actions via long-press or select mode toggle

**Empty State**: Cleaner with subtle illustration

### 4. Files to Edit
- `src/pages/PurchaseLink.tsx` — Full rewrite of the render section; move supplier to per-item; change $ to SAR; merge search; redesign cards
- `src/components/purchase-link/PurchaseSummaryHeader.tsx` — Simplify to compact inline bar (remove ring chart)
- `src/components/purchase-link/BulkActionsBar.tsx` — Update currency to SAR

