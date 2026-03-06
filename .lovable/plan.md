

## Problem

Buckets currently group items by **serial number range** (1–25, 26–50, etc.), which results in mixed categories per bucket since items were assigned serials without category grouping. The user wants buckets organized **by category** so locking operates on coherent category blocks. Additionally, the Growth Gap column needs to show actual gap/reserved slot details.

## Plan

### 1. Reorganize bucket view to be category-based

Replace the serial-range-based bucket grouping with **category-first grouping**:
- Group `categorizedItems` by category (sorted by count descending)
- Within each category, sub-group into buckets of `bucketSize`
- Each bucket header shows: category badge, serial range of items in that bucket, item count
- Lock/unlock controls operate per category-bucket

### 2. Add Growth Gap details to Category Summary table

Update the "Reserved" column to show more detail:
- **Reserved slots**: `Math.ceil(count * growthGapPercent / 100)`
- **Total range needed**: items + reserved
- Add a new **"Range"** column showing the ideal serial range (start–end) if categories were laid out sequentially with gaps

### 3. Update Category Summary with growth gap range visualization

Add columns:
| Category | Items | Buckets | Reserved | Total Range | Top Brands |

Where "Total Range" shows the computed start–end serial block including the growth gap buffer.

### Files to Change

| File | Change |
|------|--------|
| `src/components/SerialSequencingAdvisor.tsx` | Refactor `bucketGroups` memo to group by category first, then into sub-buckets. Update bucket view UI to show category-organized buckets. Add growth gap range columns to category summary. |

### Technical Details

**New `bucketGroups` logic:**
```typescript
// Group by category, then chunk into sub-buckets
const categoryBuckets = categorySummary.map(cat => {
  const items = categorizedItems.filter(i => i.category === cat.category);
  const chunks = [];
  for (let i = 0; i < items.length; i += bucketSize) {
    chunks.push(items.slice(i, i + bucketSize));
  }
  return { category: cat.category, color: cat.color, chunks, reserved: Math.ceil(items.length * growthGapPercent / 100) };
});
```

**Bucket header** will show: `[Category Badge] Bucket 1 of 3 — 25 items — 00101–00125`

**Lock controls** remain the same (checkbox per bucket, lock all per category section).

