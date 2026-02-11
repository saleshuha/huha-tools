

## Add Inventory Quantity to Print Preview + Enhanced Card Design

### Overview

Show the in-stock inventory quantity for each item in the Print Preview document, and modernize the card design for better readability and visual hierarchy.

### Changes

**1. Extend `POPrintItem` interface** (`src/utils/po-print-helpers.ts`)

Add a new optional field:
```
inventoryQty?: number;  // Current in-stock inventory quantity
```

**2. Pass inventory data in `POPrintDialog`** (`src/components/po/POPrintDialog.tsx`)

In the `enrichedItems` mapping (~line 173), look up the matching order's inventory data. Since the dialog receives raw `POOrder` objects, we need to attach inventory info before passing orders to the dialog.

**3. Attach inventory quantity to print orders** (`src/components/POTracker.tsx`)

Before setting `setPrintOrders(...)`, enrich each order with an `_inventoryQty` property using `findInventoryMatch`. This applies to all places where `setPrintOrders` is called (approximately 6-7 locations). Then in `POPrintDialog`, extract this property when building `enrichedItems`.

**4. Redesign `POPrintDocument` cards** (`src/components/po/POPrintDocument.tsx`)

Enhance the existing card layout while keeping the current structure:

- **New "Inventory" metric**: Add an inventory quantity display in the quantity section, styled with a blue/indigo color scheme, showing the available stock units (e.g., "IN STOCK" label with the quantity). Only shown when `inventoryQty > 0`.
- **Improved card header**: Add a subtle gradient top border strip color-coded by status (green = has stock, orange = pending, gray = no stock).
- **Better visual hierarchy**: 
  - Item number badge gets a colored accent matching stock status
  - ASIN displayed in a monospace font for better readability
  - SKU shown in a subtle pill/tag style
  - PO numbers section gets a light background panel
- **Summary footer enhancement**: Add a breakdown showing total items with stock vs without stock

### Technical Details

**Files to modify:**

1. **`src/utils/po-print-helpers.ts`** -- Add `inventoryQty` to `POPrintItem` interface
2. **`src/components/POTracker.tsx`** -- At each `setPrintOrders` call, map orders to include `_inventoryQty` from `findInventoryMatch`
3. **`src/components/po/POPrintDialog.tsx`** -- Extract `_inventoryQty` from matching orders and pass as `inventoryQty` to print items
4. **`src/components/po/POPrintDocument.tsx`** -- Add inventory quantity display and redesigned CSS styles for the cards

No new dependencies required. All changes use existing CSS-in-JS patterns within the print document.
