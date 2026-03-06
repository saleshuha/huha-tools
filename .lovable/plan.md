

## Problem

When you remove a serial number from a 0-stock item (via Bulk Serial Cleanup), the serial becomes an empty "gap." The current `get_next_serial_number` RPC has two issues:

1. **Global gap-filling ignores category ranges** — The fallback logic (lines 149–161 of the RPC) scans serials 1 through N looking for gaps. If it finds a freed serial like `00150` that belongs to the "Screen Protector" range, it will happily assign it to a "Cable & Charger" item. This breaks category grouping.

2. **Category-aware mode already handles reuse correctly** — When a title is provided and a category range exists, it scans the range for unused serials (lines 91–108). A freed serial within that range *will* be correctly reused by a same-category item. This part works fine.

3. **`items_used` counter is never decremented** — When serials are removed via Bulk Cleanup, the `items_used` count in `serial_range_directory` stays inflated, making the system think the range is fuller than it actually is.

4. **`additional_serial_numbers` not checked** — The RPC only checks `serial_number` column for duplicates, not the `additional_serial_numbers` array. A freed primary serial could collide with one stored as an additional serial.

## Plan

### 1. Update `get_next_serial_number` RPC — Skip category-reserved gaps

In the fallback gap-filling loop (Strategy 1), before returning a gap serial, check if it falls within any `serial_range_directory` range. If it does, skip it — that slot is reserved for its category.

Also add a check against `additional_serial_numbers` array to prevent collisions.

### 2. Update Bulk Serial Cleanup — Decrement `items_used`

When `BulkSerialCleanup` clears serials from an item, also look up the item's serial in `serial_range_directory` and decrement `items_used` for the matching range. This keeps the directory accurate.

### 3. Add `additional_serial_numbers` collision check to the RPC

In both the category-aware scan and the global gap-fill, also check:
```sql
SELECT EXISTS(
  SELECT 1 FROM asin_inventory
  WHERE user_id = p_user_id
  AND v_serial_str = ANY(additional_serial_numbers)
)
```

## Files to Change

| File | Change |
|------|--------|
| **New SQL migration** | Update `get_next_serial_number` to skip gaps inside category ranges in fallback mode; add `additional_serial_numbers` collision check |
| **`src/components/BulkSerialCleanup.tsx`** | After clearing serials, decrement `items_used` in `serial_range_directory` for the matching range |

