

## Problem

In the `smart-stock-receiving` edge function (lines 449-468), there's an explicit design decision:

```
// ✅ ALWAYS update inventory with the FULL received quantity
// PO allocation is for label tracking — inventory must always reflect physical stock
```

This means **every** item received through stock receiving — even when fully allocated to a PO — also gets added to the `asin_inventory` table with `status: 'in-stock'` and quantity incremented. So when you receive 1 unit of B0FT63SFJP against a PO, it:

1. Marks the PO as printed/received (correct)
2. **Also** adds +1 to in-stock inventory (the bug you're seeing)

## Root Cause

The `updateInventoryStock` function (line 834) always runs with the **full received quantity**, not just the leftover after PO allocation. The comment says "inventory must always reflect physical stock" — but this is wrong when the item is being fulfilled for a PO (it's going out, not staying in stock).

## Fix

Modify the edge function so that inventory is only updated with the **remaining quantity** after PO allocation, not the full received quantity.

### Changes

**File: `supabase/functions/smart-stock-receiving/index.ts`**

1. Replace the inventory update block (lines 449-468) to only call `updateInventoryStock` when `remainingQuantity > 0` (i.e., there's leftover after PO allocation).
2. When all units are allocated to POs, skip the inventory update entirely.
3. Update the `stock_receiving_items` insert to reflect actual inventory additions (`quantity_added_to_inventory: remainingQuantity` instead of `item.quantity`).
4. For PO-only fulfillments, still record a `stock_changes` entry with `reference_type: 'po_order'` for audit purposes, but without incrementing inventory quantity.

```text
Before:  receive 1 → allocate 1 to PO → still add 1 to inventory
After:   receive 1 → allocate 1 to PO → remaining = 0 → skip inventory update
```

