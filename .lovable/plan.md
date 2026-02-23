

## Advanced Noon Order Processing Overhaul

### Overview

Transform the current basic Noon Order Processing page into a full-featured, multi-step processing hub using the unified Market Purchases UI pattern (compact stat bars, card-wrapped toolbars, native tables with alternating rows, mobile card layouts).

### Current State

The page currently has:
- A single `NoonOrdersUploader` component with a gradient Card for store selection + upload
- A `NoonProcessingOrdersTable` with gradient Card styling, basic search, column toggles, and clear-all
- No batch actions, no status management, no analytics, no filtering by status/store/date

### New Architecture

Replace the single-component layout with a tabbed interface containing 4 tabs:

```text
+-------------------------------------------------------------------+
| Noon Order Processing (HuhaHeader01)                              |
+-------------------------------------------------------------------+
| [Upload] [Orders] [Analytics] [Stores]                            |
+-------------------------------------------------------------------+
```

---

### Tab 1: Upload Orders

**Redesign the upload experience:**
- Compact stat bar: Files Uploaded Today | Orders Uploaded | Last Upload | Store Selected
- Card-wrapped toolbar: Store dropdown + drag-and-drop upload zone + "Upload" button
- Recent uploads table (native `<table>` with unified styling): File name, rows uploaded, store, date, status
- Mobile card layout for recent uploads

### Tab 2: Orders Management (Main Tab)

**Major feature upgrades:**
- Compact stat bar: Total Orders | Pending | Processing | Shipped | Delivered
- Card-wrapped toolbar with:
  - Status filter pills (All / Pending / Processing / Shipped / Delivered)
  - Store filter dropdown
  - Date range filter (from/to)
  - Search input
  - Bulk actions dropdown (Delete Selected, Mark as Processing, Export)
  - Column toggle (existing, keep)
  - Item count badge
- Native `<table>` with unified styling (bg-muted/40 header, alternating rows, hover)
- Row selection checkboxes for bulk actions
- Individual row actions: View details, Delete single order
- Mobile card layout (`md:hidden`) with status badges and swipe-friendly layout
- Pagination (25/50/100 per page) for large datasets
- Empty state matching unified pattern

### Tab 3: Analytics

- Compact stat bar: Total Orders | Avg Daily | Top Store | Countries
- Visual charts using recharts:
  - Orders per day (bar chart, last 7 days)
  - Orders by status (pie/donut chart)
  - Orders by store (horizontal bar)
  - Orders by country breakdown
- All wrapped in the unified card pattern

### Tab 4: Store Management

- Move the existing `NoonStoreManagement` component here
- Wrap in unified styling (stat bar for store count + active/inactive, card toolbar)

---

### Technical Details

**Files to create:**
| File | Purpose |
|------|---------|
| `src/components/noon-processing/NoonUploadTab.tsx` | Upload tab with drag-drop, recent uploads |
| `src/components/noon-processing/NoonOrdersTab.tsx` | Main orders table with filters, bulk actions, pagination |
| `src/components/noon-processing/NoonAnalyticsTab.tsx` | Charts and analytics dashboard |
| `src/components/noon-processing/NoonStoresTab.tsx` | Store management wrapper with unified styling |

**Files to modify:**
| File | Change |
|------|--------|
| `src/pages/NoonOrderProcessing.tsx` | Replace single component with tabbed layout using HuhaTab01 |

**Files kept as-is (reused internally):**
- `src/hooks/useNoonStores.ts` -- reused in stores tab
- `src/components/NoonStoreManagement.tsx` -- embedded in stores tab

**UI Pattern applied everywhere:**
- Stat bar: `flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border`
- Toolbar: `flex items-center gap-3 p-3 rounded-xl bg-card border border-border`
- Table: native `<table>` inside `border border-border rounded-xl overflow-hidden bg-card`
- Header: `bg-muted/40 text-xs uppercase tracking-wider`
- Rows: alternating `bg-muted/10`, hover `bg-muted/20`
- Mobile: `md:hidden` card layout for every data tab
- Empty state: centered icon in `h-14 w-14 rounded-2xl bg-muted/50`

**Key features added:**
1. Status filter pills with counts
2. Store filter dropdown
3. Date range filtering
4. Row selection with checkboxes
5. Bulk delete and bulk status update
6. Pagination controls
7. Drag-and-drop upload zone
8. Recent uploads history
9. Analytics charts (orders/day, by status, by store, by country)
10. Mobile-responsive card layouts for all data views

