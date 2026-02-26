

## Plan: Fix Serial Number Sorting — Push Blank S/N Rows to Bottom

### Root Cause

The current S/N sort logic at lines 2124-2131 (global sorter) and 6374-6383 (Labels sorter) extracts serial numbers but treats empty strings (`''`) as valid comparable values. When most rows have no inventory match or no serial number, they all compare as `'' vs ''` which returns `0`, making the sort appear broken — only "Pending" status items (which happen to lack serial numbers) seem to move.

The fix: items **with** a serial number should always sort before items **without** one, regardless of ascending/descending direction. Among items with serial numbers, sort normally by the S/N value.

### Changes to `src/components/POTracker.tsx`

#### 1. Fix global sorter (lines 2124-2131)

Replace the `serial_number_qty` branch with logic that:
- Extracts S/N from match (same chain: `serialNumbers?.[0] || serialNumber || inventoryItem?.serial_number`)
- If one has S/N and the other doesn't → the one with S/N comes first (regardless of direction)
- If both have S/N → compare with `localeCompare({ numeric: true, sensitivity: 'base' })`, respecting direction
- If neither has S/N → return 0 (stable tiebreaker handles it)

```typescript
if (sortField === 'serial_number_qty') {
  const aMatch = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number, a.sunsky_sku);
  const bMatch = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number, b.sunsky_sku);
  const aSN = aMatch?.serialNumbers?.[0] || aMatch?.serialNumber || aMatch?.inventoryItem?.serial_number || '';
  const bSN = bMatch?.serialNumbers?.[0] || bMatch?.serialNumber || bMatch?.inventoryItem?.serial_number || '';
  const aHas = aSN.length > 0;
  const bHas = bSN.length > 0;
  // Push blanks to bottom always
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  if (!aHas && !bHas) return 0;
  // Both have S/N — sort by value respecting direction
  const cmp = aSN.localeCompare(bSN, undefined, { numeric: true, sensitivity: 'base' });
  return sortDirection === 'asc' ? cmp : -cmp;
}
```

#### 2. Fix Labels sorter (lines 6374-6383)

Apply the identical logic, keeping the stable tiebreaker for equal results:

```typescript
if (sortField === 'serial_number_qty') {
  const aMatch = findInventoryMatch(a.asin, a.sunsky_sku?.sku_code, a.sku_code, a.model_number, a.sunsky_sku);
  const bMatch = findInventoryMatch(b.asin, b.sunsky_sku?.sku_code, b.sku_code, b.model_number, b.sunsky_sku);
  const aSN = aMatch?.serialNumbers?.[0] || aMatch?.serialNumber || aMatch?.inventoryItem?.serial_number || '';
  const bSN = bMatch?.serialNumbers?.[0] || bMatch?.serialNumber || bMatch?.inventoryItem?.serial_number || '';
  const aHas = aSN.length > 0;
  const bHas = bSN.length > 0;
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  if (!aHas && !bHas) {
    const stableMap = stableLabelsOrderRef.current;
    return (stableMap.get(a.id) ?? Infinity) - (stableMap.get(b.id) ?? Infinity);
  }
  const cmp = aSN.localeCompare(bSN, undefined, { numeric: true, sensitivity: 'base' });
  const result = sortDirection === 'asc' ? cmp : -cmp;
  if (result !== 0) return result;
  const stableMap = stableLabelsOrderRef.current;
  return (stableMap.get(a.id) ?? Infinity) - (stableMap.get(b.id) ?? Infinity);
}
```

### Files Modified

- `src/components/POTracker.tsx` — 2 edits (global sorter ~line 2124, Labels sorter ~line 6374)

### Expected Behavior After Fix

- Click **S/N asc**: rows with serial numbers appear first sorted A→Z, then all rows without S/N at bottom
- Click **S/N desc**: rows with serial numbers appear first sorted Z→A, then all rows without S/N at bottom
- Rows without inventory matches or serial numbers never jump above rows that have them

