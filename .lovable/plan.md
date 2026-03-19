

# Physical Stock Audit System

## Concept

A dedicated "Stock Audit" feature where you start an audit session, scan barcodes on physical items one by one (or in bulk), and when finalized, any inventory item NOT scanned gets its quantity set to 0. This gives you a clean, verified stock count.

## How It Works

```text
┌─────────────────────────────────────────────┐
│  1. START AUDIT SESSION                     │
│     - Creates a new session (name, date)    │
│     - Locks session to current country      │
│                                             │
│  2. SCAN ITEMS                              │
│     - Scan barcode → looks up serial_number │
│       in asin_inventory + product_barcodes  │
│     - Each scan increments verified count   │
│     - Shows live progress (scanned / total) │
│     - Duplicate scan warning                │
│     - Manual search fallback for damaged    │
│       labels                                │
│                                             │
│  3. REVIEW & FINALIZE                       │
│     - Summary: Verified / Missing / Extra   │
│     - Export missing items list as CSV       │
│     - "Finalize Audit" button:              │
│       → Verified items: qty = scanned count │
│       → Unscanned items: qty = 0            │
│       → Logs all changes to stock_history   │
│       → Session marked as "completed"       │
└─────────────────────────────────────────────┘
```

## Database Changes

### New table: `stock_audit_sessions`
- `id` (uuid, PK)
- `user_id` (uuid, references auth.users)
- `country` (text)
- `name` (text) — e.g., "March 2026 Full Audit"
- `status` (enum: `in_progress`, `completed`, `cancelled`)
- `started_at`, `completed_at` (timestamptz)
- `total_system_items` (int) — snapshot of inventory count at start
- `total_scanned` (int) — updated as scans happen
- `total_missing` (int) — calculated at finalization
- `created_at`, `updated_at`

### New table: `stock_audit_scans`
- `id` (uuid, PK)
- `session_id` (uuid, FK → stock_audit_sessions)
- `user_id` (uuid)
- `inventory_item_id` (uuid, nullable FK → asin_inventory)
- `scanned_barcode` (text) — raw scanned value
- `matched_serial_number` (text, nullable) — resolved serial
- `matched_asin` (text, nullable)
- `scanned_quantity` (int, default 1) — for items scanned multiple times (multi-unit serials)
- `match_status` (enum: `matched`, `unmatched`, `duplicate`)
- `scanned_at` (timestamptz)

## Barcode Resolution Logic

When a barcode is scanned, resolve it in order:
1. **Direct serial match**: Check `asin_inventory.serial_number` or `additional_serial_numbers`
2. **Product barcode lookup**: Check `product_barcodes.barcode` → get ASIN → match to inventory
3. **Unmatched**: Flag as unknown — user can manually link or skip

## Frontend Components

### New page: `/stock-audit`
- Add route and sidebar navigation entry

### Components:
1. **StockAuditPage** — main page with session management
2. **AuditSessionManager** — create/resume/view past sessions
3. **AuditScanner** — barcode scanning interface (reuses existing `BarcodeScanner` component), with:
   - Live scan count and progress bar
   - Last scanned item display (ASIN, title, serial)
   - Duplicate/unmatched alerts
   - Manual serial number search input
4. **AuditReviewPanel** — shows verified vs missing items in a table
   - Tabs: "Scanned", "Missing", "Unmatched"
   - Export CSV for missing items
5. **AuditFinalizeDialog** — confirmation dialog that:
   - Shows impact summary (X items verified, Y items will be zeroed)
   - On confirm: updates `asin_inventory` quantities and logs to `stock_history`

## Files to Create/Modify
- **Create**: `src/pages/StockAudit.tsx`
- **Create**: `src/components/stock-audit/AuditSessionManager.tsx`
- **Create**: `src/components/stock-audit/AuditScanner.tsx`
- **Create**: `src/components/stock-audit/AuditReviewPanel.tsx`
- **Create**: `src/components/stock-audit/AuditFinalizeDialog.tsx`
- **Create**: `src/hooks/useStockAudit.ts`
- **Modify**: `src/App.tsx` — add route
- **Modify**: sidebar nav — add "Stock Audit" entry
- **DB Migration**: create `stock_audit_sessions` and `stock_audit_scans` tables with RLS policies

