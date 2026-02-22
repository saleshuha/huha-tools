

## Enhanced PDF Export with Preview

### What Changes

Replace the direct PDF download with a **preview dialog** that shows a professionally styled report before exporting. The PDF itself will be significantly upgraded with:

### PDF Design Enhancements
- **Header section** with report title, generation date, and date range filters
- **Summary statistics bar** showing total items, average cost, and date range
- **Styled table** with alternating row colors, colored headers, and proper cell borders
- **Source badges** rendered as colored labels (Manual = blue, Link = purple, Purchase = green)
- **Footer** with page numbers and generation timestamp
- **Supplier name column** added to the report

### Preview Dialog
- A full-screen dialog opens when clicking "Export PDF"
- Shows an HTML-rendered preview matching the PDF layout
- Two action buttons: **Download PDF** and **Close**
- Preview is scrollable for large datasets

### Technical Approach
1. Create a new `ItemCostsPdfPreview` component with the preview dialog
2. Build a shared data-formatting utility used by both the HTML preview and the jsPDF generator
3. Update `ItemCostsTab.tsx` to open the preview dialog instead of calling `exportPdf()` directly
4. Enhance the `jsPDF` generation with borders, fills, colored text, and page footers

### Files to Create/Modify
- **Create** `src/components/market-purchases/ItemCostsPdfPreview.tsx` -- preview dialog and enhanced PDF generation
- **Modify** `src/components/market-purchases/ItemCostsTab.tsx` -- wire up the preview dialog instead of direct export

