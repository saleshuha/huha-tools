

## Plan: Comprehensive Bulk Fulfillment Processing Dialog

### Problem
Currently, clicking "Bulk Fulfill" immediately starts processing in the background with no preview. Users lose visibility into what's being processed, and PO data can get lost if errors occur silently. The flow needs to be: **Preview → Confirm → Live Processing → Summary Report**.

### Solution
Replace the fire-and-forget approach with a multi-step dialog that shows all items before processing, displays live progress item-by-item during fulfillment, and then transitions to the final summary report.

### New File: `src/components/po-tracker/BulkFulfillProcessor.tsx`

A single dialog component with 3 internal phases:

**Phase 1 — Preview (before processing)**
- Table listing all eligible items: ASIN/SKU, Title, PO Number, In-Stock Qty, Pending Qty, Fulfill Qty (auto-calculated as `min(stock, pending)`)
- Summary bar: Total Items, Total Qty to Fulfill, Items with insufficient stock (shown but greyed out)
- "Start Fulfillment" and "Cancel" buttons
- Items grouped by ASIN so shared-stock depletion is visible

**Phase 2 — Processing (live progress)**
- Same table but each row gets a status indicator that updates in real-time:
  - ⏳ Waiting → 🔄 Processing → ✅ Success / ❌ Failed
- Progress bar at top showing `current/total`
- Current item highlighted with a subtle pulse animation
- "Cancel Remaining" button to abort mid-process
- Each row updates immediately after its edge function call completes

**Phase 3 — Summary Report (after completion)**
- Reuses the existing `BulkFulfillSummary` layout (stats bar, grouped table, print/CSV export)
- Enhanced with the professional PDF layout already built
- "Close" and "Export" buttons

### Modified File: `src/components/POTracker.tsx`

1. **Change button behavior**: Instead of calling `handleBulkFulfillFromStock` directly, clicking "Bulk Fulfill" opens the new `BulkFulfillProcessor` dialog with the eligible orders pre-computed

2. **Move processing logic into the dialog**: The `handleBulkFulfillFromStock` logic (edge function calls, stock tracking, fallback) moves into `BulkFulfillProcessor` as an internal async handler, using state updates after each item to show live progress

3. **New state**: Replace `isBulkFulfilling` / `bulkFulfillProgress` with a single `bulkProcessorOpen` boolean + pass eligible orders as props

4. **Eligible order computation**: Extract the eligibility-building loop (lines 1039-1067) into a standalone function `getEligibleOrders()` that returns the list, so it can be called on button click to populate the dialog

### Data Flow

```text
User clicks "Bulk Fulfill" button
  → getEligibleOrders() computes eligible items from selection
  → BulkFulfillProcessor dialog opens in Preview phase
  → User reviews items, clicks "Start Fulfillment"
  → Phase switches to Processing
  → For each item sequentially:
      - Row status → "Processing"
      - Call fulfill-from-stock edge function (with fallback)
      - Row status → "Success" or "Failed" with details
      - Stock tracking map updated
  → All done → Phase switches to Summary
  → User can Print / Export CSV / Close
```

### Files
- **Created**: `src/components/po-tracker/BulkFulfillProcessor.tsx`
- **Modified**: `src/components/POTracker.tsx` — replace inline bulk fulfill logic with dialog trigger
- **Kept**: `src/components/po-tracker/BulkFulfillSummary.tsx` — reused inside the processor for Phase 3

