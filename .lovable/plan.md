

## Rebuild: Serial Number Advisor — Category + Brand Range Planner

### Current Problem
The advisor currently shows **existing inventory items** grouped into buckets — essentially a read-only view of what's already assigned. The user wants it to be a **planning tool** that defines serial number ranges for **future assignment**, organized by category and then by brand within each category, with growth gaps at both levels.

### New Purpose
A **Serial Range Planner** that:
1. Analyzes current inventory to count items per category per brand
2. Computes ideal serial ranges: Category → Brand → serial block
3. Includes configurable growth gaps between brands and between categories
4. Saves the plan to `serial_range_directory` so `get_next_serial_number` RPC uses it for future assignments

### Database Change
Add a `brand` column to `serial_range_directory` so ranges can be stored at the brand level:

```sql
ALTER TABLE serial_range_directory ADD COLUMN brand text DEFAULT 'All';
```

### New UI Layout

```text
┌─────────────────────────────────────────────────────┐
│ Serial Range Planner                                │
│ Plan serial number ranges for future assignment     │
├─────────────────────────────────────────────────────┤
│ [Bucket Size: 25] [Category Gap: 20%] [Brand Gap: 10%] │
│ [Apply Plan]                                        │
├─────────────────────────────────────────────────────┤
│ Range Plan Preview                                  │
│                                                     │
│ ▼ TPU / Carbon Fiber Case (1028 items)              │
│   ├ Apple        142 items  00001–00142  gap: +14   │
│   ├ OPPO         202 items  00157–00358  gap: +20   │
│   ├ Samsung      161 items  00379–00539  gap: +16   │
│   ├ Xiaomi       139 items  00556–00694  gap: +14   │
│   ├ Other        384 items  00709–01092  gap: +38   │
│   └ [Category gap: +206 reserved → ends at 01298]  │
│                                                     │
│ ▼ Miscellaneous (340 items)                         │
│   ├ Samsung       69 items  01299–01367  gap: +7    │
│   ├ ...                                             │
│   └ [Category gap: +68 reserved → ends at 01778]   │
│                                                     │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│                              [Close] [Save Plan]    │
└─────────────────────────────────────────────────────┘
```

### Component Rewrite — `SerialSequencingAdvisor.tsx`

**State:**
- `categoryGapPercent` (default 20%) — gap after each category
- `brandGapPercent` (default 10%) — gap after each brand within a category
- `expandedCategories` — collapsible sections

**Core Logic:**
1. Group all active items by category, then by brand within each category
2. Sort categories by item count (descending), brands alphabetically within each category
3. Compute sequential ranges:
   ```
   cursor = 1
   for each category (sorted by count desc):
     for each brand (sorted alphabetically):
       brandCount = items in this category+brand
       brandGap = ceil(brandCount * brandGapPercent / 100)
       assign range: cursor → cursor + brandCount - 1
       cursor += brandCount + brandGap
     categoryGap = ceil(totalCategoryItems * categoryGapPercent / 100)
     cursor += categoryGap
   ```
4. Display as collapsible category sections with brand rows showing: brand name, item count, serial range, gap slots

**"Save Plan" button:**
- Clears existing `serial_range_directory` rows for the user
- Inserts one row per category+brand with `range_start`, `range_end`, `brand`, `items_used`
- Shows success toast

### Files to Change

| File | Change |
|------|--------|
| `src/components/SerialSequencingAdvisor.tsx` | Full rewrite — planning tool with category+brand ranges, growth gaps, save functionality |
| **SQL migration** | Add `brand` column to `serial_range_directory` |

### What Gets Removed
- Bucket-based item listing (no longer showing individual items)
- Lock/unlock per item (not needed — this is a planner, not a lock manager)
- Search by title/ASIN (irrelevant for range planning)
- Sort mode toggle (brands always sorted alphabetically)

