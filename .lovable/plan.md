

## Add In-Stock Filter + Print Preview for All Filter Groups

### Overview

Add an "In Stock" filter alongside the existing Print Status, Source, and Fulfillment filters in the Labels tab filter pills row. Also add a "Print Preview" button to the Source, Fulfillment, and new In-Stock filter groups (currently only Print Status has one).

### Changes

**1. New State: `instockFilter`**

Add a new state variable similar to the existing filter patterns:
```
const [instockFilter, setInstockFilter] = useState<string[]>([]);
```
Options will be: `in-stock` (has inventory qty > 0), `out-of-stock` (no inventory match or qty = 0).

**2. Apply In-Stock Filter in the Filtering Memo (~line 2028)**

After the existing fulfillment filter block, add a new filter block that uses `findInventoryMatch` to check each order's stock status:
- `in-stock`: order has an inventory match with status `in-stock` and quantity > 0
- `out-of-stock`: order has no match or zero stock

Add `instockFilter` to the useMemo dependency array.

**3. Helper Functions for Each Filter's Print Preview**

Create helper functions (similar to `getSelectedPOsOrdersByPrintStatus`) for each filter group so the Print Preview button in each section opens labels for only the items matching that specific filter:
- `getSelectedPOsOrdersBySource()` -- filters by source match
- `getSelectedPOsOrdersByFulfillment()` -- filters by fulfillment status  
- `getSelectedPOsOrdersByInstock()` -- filters by in-stock status

**4. UI: Add In-Stock Filter Group (~after line 5653)**

Add a new filter section after the Fulfillment filter with the same pattern:
- Vertical divider
- Warehouse icon + "In Stock:" label
- Popover with checkboxes for "In Stock" and "Out of Stock"
- Clear button when filter is active
- Print Preview button showing filtered count

**5. UI: Add Print Preview Buttons to Source and Fulfillment Groups**

Add a Print Preview button (same style as the one in Print Status) to:
- **Source filter group** (~line 5598, after the Clear button): Opens print dialog with only sunsky-matched or not-matched items based on the current `sourceFilter`
- **Fulfillment filter group** (~line 5649, after the Clear button): Opens print dialog with only fulfilled/partial items based on `fulfillmentFilter`

Each Print Preview button will:
- Be disabled when no POs are selected
- Show a badge with the count of matching items when a filter is active
- Open the same `setPrintDialogOpen` flow with filtered orders

### Technical Details

**File: `src/components/POTracker.tsx`**

- ~Line 115: Add `instockFilter` state
- ~Line 2029-2050: Add in-stock filtering logic using `findInventoryMatch`
- ~Line 2125: Add `instockFilter` to useMemo deps
- ~Line 2150-2180: Add 3 new helper functions for filtered print previews
- ~Line 5598: Add Print Preview button to Source filter group
- ~Line 5649: Add Print Preview button to Fulfillment filter group
- ~Line 5653: Add vertical divider + new In-Stock filter group with Popover, checkboxes, Clear button, and Print Preview button

No new files or dependencies required.
