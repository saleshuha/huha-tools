

## Fix: Stock Receiving Search & Dialog Showing Wrong Item Type

### Root Cause (3 bugs found)

**Bug 1 — Dialog always loads POs regardless of item type**: `QuantityConfirmDialog.loadAvailablePOs()` (line 125) runs for every item, including `type: 'inventory'`. It queries `po_orders` by ASIN/SKU without filtering by status or excluding fully printed POs. So an inventory item opens and shows "Found in 1 PO" — confusing because the user clicked an inventory result.

**Bug 2 — Fully printed POs appear in dialog**: The search correctly filters out fully printed POs (`quantity - printed_quantity > 0` at line 506-508), but `loadAvailablePOs()` in the dialog has no such filter. So POs that were already fully printed still show up.

**Bug 3 — Inventory items hidden when PO exists**: At line 628-629, if a PO result already exists with the same ASIN, the inventory result is skipped entirely (`if (!exists)`). This means if there's even 1 pending PO for ASIN B0DYGKYDBF, the inventory entry is suppressed from results — user never sees the "In inventory" option.

### Fixes

#### 1. `src/components/stock-receiving/QuantityConfirmDialog.tsx` — Filter POs properly

In `loadAvailablePOs()`:
- Add `.in('status', ['pending', 'placed'])` to all PO queries
- Exclude fully printed POs after fetch: filter where `quantity - (printed_quantity || 0) > 0`
- When no pending POs found for an inventory item, set `maxQuantity = 999` (no PO cap) and show "No pending POs — receiving to inventory" message

#### 2. `src/components/stock-receiving/ItemSearchBar.tsx` — Show inventory results even when PO exists

At line 628-643, change the dedup logic: instead of skipping inventory items when a PO exists, always include them but mark them clearly. This lets the user choose whether to receive against the PO or directly to inventory.

Change from:
```typescript
if (!exists) { searchResults.push({ type: 'inventory', ... }); }
```
To:
```typescript
// Always show inventory results (user may want to receive to stock, not PO)
searchResults.push({ type: 'inventory', ... });
```

#### 3. `src/components/stock-receiving/QuantityConfirmDialog.tsx` — Inventory-aware display

- For `item.type === 'inventory'`: show "Receiving to Inventory" header, display POs as optional context ("Also found in X pending POs") rather than primary view
- Set `maxQuantity = 999` for inventory items when no POs are pending (currently it stays at whatever the PO total is, which can be 0 and block submission)

### Files Modified
- `src/components/stock-receiving/QuantityConfirmDialog.tsx` — Add status/printed filters to PO query, inventory-aware display logic, fix maxQuantity for inventory
- `src/components/stock-receiving/ItemSearchBar.tsx` — Remove dedup that hides inventory when PO exists

