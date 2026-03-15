

## Fix: Fulfillment Print Preview — Print Layout

### Problems
1. The dialog header (title, icon, stats bar) prints unnecessarily — user wants it removed from print
2. Rows need clear, visible borders separating each item
3. `table-layout: fixed` with `white-space: nowrap` causes column clipping — title column gets cut off
4. SVGs are hidden entirely (including status icons), but that's acceptable
5. The `overflow: hidden` + `text-overflow: ellipsis` on all cells clips content

### Changes — `src/components/po-tracker/FulfillmentPrintPreview.tsx`

**Print CSS rewrite (lines 325–457):**

1. **Hide the entire header section**: Add `print-header` class elements to `display: none !important` — removes title, icon, stats bar, and buttons from print output
2. **Stronger row borders**: Change from `0.5px solid #ccc` to `1px solid #333` on `td` cells for clear row separation
3. **Remove `table-layout: fixed`**: Use `auto` so columns size naturally to content
4. **Allow title column to wrap**: Keep `white-space: normal` on title column (3rd data column after reorder)
5. **Remove overflow hidden** on cells — let content flow naturally at small font size
6. **Add bottom border on each `tr`**: Extra `border-bottom: 1.5px solid #000` on each `tbody tr` for strong row delineation
7. **Keep zebra striping** with slightly more contrast (`#f0f0f0` vs white)
8. **Print font size**: Bump to 8pt for better readability while still fitting landscape

### Files
- **Modified**: `src/components/po-tracker/FulfillmentPrintPreview.tsx` — print CSS block only

