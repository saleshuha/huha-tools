

# Add Print Status Filter to PO Print Dialog

## What Changes

Add a multi-select print status filter in the left panel (between the search bar and the item list) that lets you filter items by: **Fully Printed**, **Partially Printed**, and **Not Printed**. Also audit the metrics (Selected Items, Total Quantity) to ensure they reflect only the visible/filtered items correctly.

## How It Works

A row of toggle buttons (chips) below the search input:
- **Not Printed** — items where `printed_quantity` is 0 or null
- **Partial** — items where `0 < printed_quantity < quantity`
- **Fully Printed** — items where `printed_quantity >= quantity`

Multiple can be active at once. When none are active, all items show (no filter). The item count in the "Items to Print" header and the Summary metrics will update to reflect the filtered + selected items.

## Technical Details

### File: `src/components/po/POPrintDialog.tsx`

1. **New state**: `printStatusFilter` — a `Set<'printed' | 'partial' | 'not_printed'>`, default empty (show all)

2. **Extend `filteredOrdersWithIndices` memo** — after the search filter, apply the print status filter:
   - Classify each order: if `printed_quantity >= quantity` → "printed", if `printed_quantity > 0` → "partial", else → "not_printed"
   - If `printStatusFilter` is non-empty, keep only matching orders

3. **UI**: Add 3 toggle buttons styled as chips/badges below the search bar, each toggling its status in the set. Show active state with filled variant.

4. **Metrics audit**: The Summary section already derives from `printItems` which comes from `selectedItems`. The "Items to Print" label already shows `filteredOrders.length`. Since the filter feeds into `filteredOrdersWithIndices`, all downstream counts will be correct. Will verify `totalQuantity` sums only selected items (it does — line 461 sums `printItems`).

### Single file change — `src/components/po/POPrintDialog.tsx`

