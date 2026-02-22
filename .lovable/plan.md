

## Plan: Enhanced Mobile Purchase Link with Supplier Separation

### What This Does

Three improvements to the public purchase link page (`/market-purchase/:token`):

1. **Bigger, better mobile cards** -- Larger images (20x20), bigger text, more spacing, full-width cost input, and clearer visual hierarchy for warehouse use.

2. **Two-tab layout: "Pending" and "Assigned"** -- Items with a supplier selected move to the "Assigned" tab automatically. The "Pending" tab shows items still needing a supplier. This keeps the working list clean and focused.

3. **Cost not required for supplier assignment** -- Currently the `saveRow` function only upserts to `market_item_costs` when `unit_cost > 0`. This will be changed so that selecting a supplier triggers a save regardless of whether a cost has been entered.

---

### Technical Details

**File: `src/pages/MarketPurchasePublic.tsx`**

**A) Mobile card redesign:**
- Increase image from `w-12 h-12` to `w-20 h-20`
- Remove `line-clamp-2` on title, show full text
- Increase title font from `text-xs` to `text-sm`
- Make cost input full-width with a label
- Add more padding (`p-4` instead of `p-3`)
- Increase supplier dropdown height from `h-7` to `h-9`

**B) Tab-based item separation:**
- Add `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from the existing UI library
- Split `items` into two derived lists:
  - `pendingItems` = items where `!item.supplier_name`
  - `assignedItems` = items where `item.supplier_name` exists
- Render both desktop table and mobile cards inside their respective tab panels
- Show item counts in each tab trigger badge

**C) Save logic update:**
- In the `saveRow` function, change the condition from `if (item && item.unit_cost > 0)` to `if (item && (item.unit_cost > 0 || item.supplier_name))` so that supplier-only saves are persisted to `market_item_costs`
- When upserting with no cost, use `unit_cost: item.unit_cost || 0`

**D) Summary totals:**
- Update the header badges and footer totals to reflect the currently visible tab
- Show total across both tabs in the header card

