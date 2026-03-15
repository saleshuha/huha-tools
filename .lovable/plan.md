

## Fix: Fulfillment Print — New Window Approach

### Root Cause
The current approach tries to use `window.print()` with complex CSS to show/hide elements within a Radix Dialog portal. This is inherently fragile — Radix portals, overlay backdrops, and `visibility: hidden` cascades conflict across browsers and cause columns/data to disappear.

### Solution
Replace `window.print()` with a **new-window print** approach. The `handlePrint` function will:

1. Build a standalone HTML document string containing only the table data (no title, no dialog chrome)
2. Open it in a new window via `window.open()`
3. Call `newWindow.print()` then close it

This completely bypasses all Radix portal / CSS visibility issues.

### Changes — `src/components/po-tracker/FulfillmentPrintPreview.tsx`

1. **Rewrite `handlePrint`** (line 133): Instead of `window.print()`, generate a full HTML string with:
   - `@page { size: landscape; margin: 8mm; }` 
   - Clean table with all 10 columns: #, ASIN/SKU, Title, PO Number, PO Qty, Pending, In-Stock, Serial #, Fulfilled, Status
   - Inline styles: 8pt font, collapsed borders, `1px solid #333` on cells, zebra striping `#f0f0f0`, bold header row `#e8e8e8`, footer totals `#e0e0e0`
   - Title column (`white-space: normal; word-break: break-word`) — all others `nowrap`
   - No title/header — just the data table with a small "Generated: {date}" line at bottom
   - Strong row borders (`border-bottom: 1.5px solid #000`)

2. **Remove the entire `<style>` block** (lines 325–460): No longer needed since printing happens in a new window

### Files
- **Modified**: `src/components/po-tracker/FulfillmentPrintPreview.tsx`

