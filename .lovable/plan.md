

## Plan: Intelligent Serial Number Sequencing Suggestion System

### Problem
Currently, 2,069 items are assigned serial numbers sequentially as they arrive. This means bucket 1 (00001-00025) contains a mix of TPU cases, screen protectors, and random items. Finding products physically is inefficient because similar items are scattered across different buckets.

### Current Data Analysis
Your inventory has these product categories:
- **Phone Cases (TPU/Carbon Fiber)**: ~1,009 items
- **Screen Protectors**: ~235 items
- **TV/AC Remotes**: ~119 items
- **Cables/Chargers**: ~42 items
- **Audio (Earphones)**: ~14 items
- **Other** (leather cases, silicone cases, watch bands, shockproof cases, flip covers, etc.): ~650 items

### Solution: Serial Number Resequencing Advisor

A new tool accessible from the "Data Entry & Import" section that:

1. **Categorizes all products** by parsing titles using keyword matching into granular sub-categories (not just "Phone Case" but "TPU Carbon Fiber Case", "Leather Flip Case", "Silicone Case", "Screen Protector", "Watch Band", "Remote Control", etc.)

2. **Generates an optimal serial number mapping** that groups similar products into the same buckets of 25, sorted alphabetically within each category for easy physical lookup

3. **Shows a preview** of the suggested resequencing — current serial vs suggested serial, organized by bucket, with category labels

4. **Applies changes** — bulk-updates `serial_number` in `asin_inventory` for all affected rows in a single operation

### Category Detection Logic (Title Parsing)

```text
Priority-ordered keyword rules:
1. "Tempered Glass" / "Screen Protector"  → Screen Protector
2. "TPU Case" / "Carbon Fiber"            → TPU Carbon Fiber Case  
3. "Silicone Case" / "Silicone Phone"     → Silicone Case
4. "Leather Case" / "Flip Leather"        → Leather Case
5. "Shockproof" / "Rugged"               → Shockproof Case
6. "Remote" / "IR Remote"                → Remote Control
7. "Watch Band" / "Watch Strap"          → Watch Band
8. "Cable" / "Charger" / "Adapter"       → Cable & Charger
9. "Earphone" / "Headphone" / "Earbuds"  → Audio Accessory
10. "HDMI" / "Converter" / "Hub"         → Electronics Accessory
11. Everything else                       → Miscellaneous
```

Within each category, items are further sub-sorted by brand/device (Samsung, iPhone, Xiaomi, etc.) extracted from the title.

### UI Design

A new dialog "Serial Number Sequencing Advisor" with:

- **Step 1 - Analyze**: Scans all items, categorizes them, shows a summary table (Category | Item Count | Buckets Needed)
- **Step 2 - Preview**: Shows the proposed bucket layout in a table:
  - Bucket 1 (00001-00025): TPU Carbon Fiber Cases (Samsung)
  - Bucket 2 (00026-00050): TPU Carbon Fiber Cases (Xiaomi)
  - etc.
- **Step 3 - Apply**: One-click to apply the new serial number mapping. Shows a confirmation with "X items will be reassigned"
- Option to **exclude items** from resequencing (lock certain serials)
- Option to set **custom bucket size** (default 25)

### Implementation Steps

#### 1. Create new component `SerialSequencingAdvisor.tsx`
- Title parser function that categorizes products into ~12 categories
- Brand extractor (Samsung, iPhone, Xiaomi, OPPO, Realme, Motorola, etc.)
- Sorting algorithm: Category → Brand → Title alphabetical
- Bucket assignment: assigns new serial numbers (zero-padded to 5 digits) based on sorted order
- Preview table with current vs proposed serial, category badge, bucket grouping
- Apply function that batch-updates `serial_number` in `asin_inventory`

#### 2. Add button to AsinInventory.tsx
- New `EnhancedActionButton` in the "Data Entry & Import" section
- Opens the `SerialSequencingAdvisor` dialog

#### 3. No database migration needed
- Uses existing `asin_inventory.serial_number` column
- All logic is client-side categorization + direct updates

### Files to Create/Modify
- **New**: `src/components/SerialSequencingAdvisor.tsx`
- **Edit**: `src/components/AsinInventory.tsx` (add button + import)

