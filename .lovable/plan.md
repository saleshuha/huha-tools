

# Daily Orders Tab Improvements

## Changes

### 1. Bigger Table Images
Increase the desktop table image from `h-14 w-14` (56px) to `h-20 w-20` (80px), and update the column width from `w-[68px]` to `w-[92px]`. Mobile card images increase from `h-16 w-16` to `h-20 w-20`.

### 2. Verify Qty Accuracy
The consolidation logic at lines 74-111 sums `item_quantity` from `order_imports` (Amazon) and `quantity` from `noon_processing_orders` (Noon) per unique ASIN/SKU. The `totalQty` is `amazonQty + noonQty` (line 111). The stat bar totals use `items.reduce()` which correctly sums all items. The footer row also uses `items.reduce((s, i) => s + i.totalQty, 0)`. This logic is correct — each row from the uploaded file contributes its quantity to the matching consolidated item. No bug here, but I'll add a visible "Total Qty" sum in the stat bar for quick cross-checking.

### 3. New PDF Export — Image, Title, ASIN, Qty Only
Add a second export button "Export Summary PDF" that generates a cleaner PDF with:
- **Large product images** loaded from URLs (using jsPDF's `addImage` with fetched image data)
- **Title** column
- **ASIN** column  
- **Total Qty** column
- Footer with total qty sum

Images will be fetched as base64 via canvas, with a fallback placeholder for failed loads. Each row will be taller (~25mm) to accommodate the large image.

## Technical Details

### File: `src/components/market-purchases/DailyOrdersTab.tsx`

1. **Image size** — Change `h-14 w-14` → `h-20 w-20` on line 430, column width `w-[68px]` → `w-[92px]` on line 413
2. **New `exportSummaryPDF` function** — Fetches product images as base64, builds a portrait A4 PDF with 4 columns (Image ~20x20mm, Title, ASIN, Qty), paginated
3. **New button** — Add "Summary PDF" button next to the existing "PDF Export" button in the toolbar

### Single file change

