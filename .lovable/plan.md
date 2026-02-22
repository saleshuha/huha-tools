
## Fix: Supplier Dropdown Causing Layout Shift on Mobile

### Problem
When tapping the supplier dropdown on mobile, the Radix Select component locks scrolling and repositions content via a portal, which causes:
1. The table/cards to visually shrink
2. The selected item to scroll out of view
3. Scrolling to see the item dismisses the dropdown

### Root Cause
Radix Select uses `modal={true}` by default, which locks body scroll when the dropdown opens. On mobile, this scroll-lock causes the viewport to resize/reflow, pushing the triggering card out of view.

### Solution
Two changes in `src/pages/MarketPurchasePublic.tsx`:

1. **Disable modal behavior on mobile Select**: Add `modal={false}` to all `<Select>` components in the mobile card view. This prevents scroll-locking so the page stays stable when the dropdown opens.

2. **Use `position="popper"` on SelectContent**: Ensures the dropdown renders anchored to the trigger rather than repositioning to the center of the viewport. This keeps the dropdown near the item being edited.

3. **Add `side="bottom"` and `align="start"`** on mobile SelectContent to force consistent positioning below the trigger.

### Technical Changes

**File: `src/pages/MarketPurchasePublic.tsx`**

- In `renderMobileCards`, change the supplier `<Select>` to include `modal={false}`:
  ```
  <Select modal={false} value={...} onValueChange={...}>
  ```
- Update mobile `<SelectContent>` to use explicit positioning:
  ```
  <SelectContent className="bg-popover z-[100]" position="popper" side="bottom" align="start">
  ```
- Apply same fix to the desktop table Select for consistency

This is a minimal, targeted fix -- no layout restructuring needed.
