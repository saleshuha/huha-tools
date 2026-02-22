

## Fix: Supplier Dropdown Layout Shift + Noon SKU Text Overflow

### Problems

1. **Dropdown still shrinks layout on mobile** -- The previous fix added `position="popper"` but did not add `modal={false}` to the `<Select>` component. Radix Select's default `modal={true}` still locks body scroll and causes viewport reflow when the dropdown opens.

2. **Noon SKUs overflow on mobile cards** -- In `MarketPurchasePublic.tsx`, the ASIN and SKU text in mobile cards has no truncation or max-width constraints. Long Noon SKUs push the card layout out of bounds.

3. **Same SKU overflow in DailyOrdersTab mobile cards** -- The truncation fix applied earlier uses `max-w-[120px]` and `max-w-[100px]`, but the parent container at line 272 may still allow overflow for very long Noon SKU strings.

---

### Changes

#### A) Add `modal={false}` to all Select components in MarketPurchasePublic.tsx

**File: `src/pages/MarketPurchasePublic.tsx`**

Both Select components (desktop at line 310 and mobile at line 384) need `modal={false}`:

```tsx
<Select modal={false} value={item.supplier_name || ""} onValueChange={...}>
```

This prevents scroll-locking so the page stays stable when the dropdown opens on mobile.

#### B) Add text truncation for ASIN/SKU in MarketPurchasePublic mobile cards

**File: `src/pages/MarketPurchasePublic.tsx`**

Lines 372-375: The ASIN and SKU spans have no truncation. Fix:

```tsx
<div className="flex items-center gap-2 mt-1.5 min-w-0 overflow-hidden">
  <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">{item.asin}</span>
  {item.sku && <span className="text-xs text-muted-foreground truncate max-w-[100px]">· {item.sku}</span>}
</div>
```

Also add `overflow-hidden` to the parent `div.flex-1` at line 370 to ensure truncation works.

#### C) Strengthen truncation in DailyOrdersTab mobile cards

**File: `src/components/market-purchases/DailyOrdersTab.tsx`**

Line 276: Increase SKU max-width constraint and ensure the flex container at line 274 doesn't allow overflow. The ASIN at line 275 already has `max-w-[120px]` but the SKU at line 276 needs `max-w-[80px]` (shorter since it shares the row with ASIN):

```tsx
<div className="flex items-center gap-1 mt-1 min-w-0 overflow-hidden flex-wrap">
  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{item.asin}</span>
  {item.sku && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">· {item.sku}</span>}
</div>
```

Also ensure the desktop table Product column at line 366-371 has proper truncation for SKU text.

### Technical Summary

| File | What | Lines |
|------|------|-------|
| MarketPurchasePublic.tsx | Add `modal={false}` to desktop Select | ~310 |
| MarketPurchasePublic.tsx | Add `modal={false}` to mobile Select | ~384 |
| MarketPurchasePublic.tsx | Add truncation to mobile ASIN/SKU | ~372-375 |
| DailyOrdersTab.tsx | Tighten SKU truncation in mobile cards | ~274-276 |
| DailyOrdersTab.tsx | Add truncation to desktop table SKU | ~368-370 |

