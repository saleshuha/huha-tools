

## Fix: Fulfillment Print Preview — Print Layout

### Problem
The `@media print` CSS in `FulfillmentPrintPreview.tsx` has several issues:
1. The selector `.fulfillment-print-dialog` targets `DialogContent`, but Radix Dialog renders inside a portal — the `body * { visibility: hidden }` approach hides the portal overlay and the content may not be reachable by the class selector
2. No landscape orientation set — 10 columns won't fit on portrait paper
3. The overflow container clips content in print (max-height constraint still active)
4. Table text too large and columns too wide for paper
5. Dark mode colors bleed into print (badges, backgrounds)

### Changes — `src/components/po-tracker/FulfillmentPrintPreview.tsx`

Rewrite the `<style>` block with robust print CSS:

1. **Target the Radix portal**: Use `[data-radix-portal]` and `[role="dialog"]` selectors to ensure visibility through the portal
2. **Landscape orientation**: Add `@page { size: landscape; margin: 8mm; }`
3. **Remove overflow constraints**: Set `max-height: none`, `overflow: visible` on all scroll containers within the dialog
4. **Compact table**: Reduce font to 7pt, tighten padding to `2px 4px`, force `white-space: nowrap` on numeric columns
5. **Force light colors for print**: Set all text to black, backgrounds to white, badge borders to gray
6. **Ensure full width**: `width: 100vw` on the dialog, `table-layout: fixed` with appropriate column widths
7. **Hide dialog overlay/backdrop**: `[data-radix-portal] > [data-state] { background: transparent !important; }`
8. **Page breaks**: `page-break-inside: avoid` on table rows

### Files
- **Modified**: `src/components/po-tracker/FulfillmentPrintPreview.tsx` — rewrite print `<style>` block

