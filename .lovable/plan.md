

## Fix Reprint to Print Per-PO + Add Single Reprint + Double Confirmation

### Problems Identified
1. The per-item "Reprint (74)" button calls `handleReprintWithoutTracking(order, order.printed_quantity)` using the consolidated order object, which only carries one PO number. All 74 labels print under the same PO instead of distributing across the actual underlying POs.
2. No separate button to reprint just 1 label for quick checks.
3. The "Reprint All Labels" bulk button needs a stronger double-check confirmation.

### Changes to `src/components/POTracker.tsx`

**1. Fix `handleReprintWithoutTracking` to handle consolidated orders (~line 3337)**

Update the function to check if the order is consolidated. If it is, iterate through `_consolidatedOrders` and generate ZPL using each underlying order (with correct PO data) for that order's `printed_quantity`. This ensures labels print with the correct PO number per item.

```
if (order._isConsolidated && order._consolidatedOrders) {
  for (const underlyingOrder of order._consolidatedOrders) {
    const qty = underlyingOrder.printed_quantity || 0;
    for (let i = 0; i < qty; i++) {
      allZPLCodes.push(generateZPLFromTemplate(underlyingOrder, printSettings));
    }
  }
} else {
  for (let i = 0; i < quantity; i++) {
    allZPLCodes.push(generateZPLFromTemplate(order, printSettings));
  }
}
```

**2. Add a "Reprint 1" single-label button (~line 7049)**

Add a separate button before the existing "Reprint (N)" button that reprints exactly 1 label. For consolidated orders, it will use the first underlying order to get the correct PO data.

- Label: "Reprint 1"
- Icon: `RefreshCw`
- Only visible when `printed_quantity > 0`
- Calls `handleReprintWithoutTracking(order, 1)` (the updated function handles consolidated correctly)

**3. Update per-item Reprint button label (~line 7050)**

Change from "Reprint (74)" to "Reprint All (74)" to differentiate from the single reprint button.

**4. Add double-check to "Reprint All Labels" bulk button (~line 7443)**

Add a two-step confirmation:
- Step 1: Show the existing summary dialog with a "Continue" button
- Step 2: Show a final confirmation with a typed or checkbox confirmation ("I confirm I want to reprint X labels")
- This is implemented by adding a `reprintConfirmStep` state (1 or 2) and showing different dialog content based on the step

### Summary of button layout per item row
- **Reprint 1** -- prints 1 label (for quick test/check)
- **Reprint All (N)** -- reprints all N previously printed labels, distributed by PO
- Both correctly use underlying PO data for consolidated items

