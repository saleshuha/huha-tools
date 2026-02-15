

## Enhance Processing History: Serial Numbers, Date Filtering, and Cleaner UI

### What Changes

1. **Add serial number tracking** -- Store serial numbers when orders are processed and display them in the history table.

2. **Date-wise filtering with today as default** -- Add date picker/tabs so users can view history by date, always opening to today's processed orders.

3. **Cleaner, more modern UI** -- Simplify the dialog layout with better spacing, a compact table, and a streamlined detail panel.

---

### Technical Details

#### 1. Database: Add `serial_number` column to `processed_orders`

Run a migration to add a nullable `serial_number` text column to the `processed_orders` table.

#### 2. Store serial number on insert (`DFProcessStep.tsx`)

Update the insert call (~line 120) to include `serial_number: order.serialNumber || null` so it gets saved alongside the other order data.

#### 3. Update `DFProcessingHistoryDialog.tsx` (main changes)

**Data model:**
- Add `serial_number` to the `ProcessedOrderRecord` interface.

**Date filtering:**
- Add a `selectedDate` state defaulting to today's date.
- Group all records by date and show date tabs/chips along the top (e.g., "Today", "Feb 14", "Feb 13").
- Filter the displayed records to match the selected date.
- The query remains the same (fetch last 500), but the UI groups and filters client-side by date.

**Table columns update:**
- Add a "Serial #" column after the "ASIN / SKU" column.
- Remove the "Title" column from the main table (move to detail panel only) to keep it compact.
- The serial number displays as a small mono-text badge.

**Detail panel:**
- Add serial number to the detail panel between SKU and the separator.

**UI improvements:**
- Stats bar: Make it more compact with inline badges instead of card boxes.
- Date chips row: Horizontal scrollable row of date buttons (today highlighted by default).
- Table: Tighter padding, alternating row colors for readability.
- Footer: Show count for selected date vs total.

**Export CSV:**
- Add `Serial Number` column to the CSV export.

#### 4. Also update `OrderProcessor.tsx` and `OrderProcessorNew.tsx` insert calls

These files also insert into `processed_orders`. Add `serial_number` field to those insert calls as well to ensure consistency across all processing flows.

### File Changes Summary

| File | Change |
|------|--------|
| Migration SQL | Add `serial_number` text column |
| `src/components/df-processing/DFProcessStep.tsx` | Include `serial_number` in insert |
| `src/components/OrderProcessor.tsx` | Include `serial_number` in insert |
| `src/components/OrderProcessorNew.tsx` | Include `serial_number` in insert |
| `src/components/df-processing/DFProcessingHistoryDialog.tsx` | Add date filtering, serial number column, UI refresh |

