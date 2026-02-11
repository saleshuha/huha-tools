

## Enhanced PO Selection Table UI

### Overview

Reorganize the controls toolbar and upgrade the table design for the Labels tab PO selection view, keeping all existing functionality intact.

### Changes

**1. Toolbar Reorganization (lines ~4164-4233)**

Current layout is a single row with search, location dropdown, mix locations button, and PO count badge all inline. This will be restructured into a cleaner grouped layout:

- **Left group**: Search input (wider, with refined styling)
- **Right group**: Location filter + Mix Locations toggle combined into a single segmented control, PO count badge

**2. Selection Action Bar (lines ~4236-4307)**

Currently a flat row of buttons that gets crowded. Will be reorganized:

- Left side: Selection count badge + Clear button (unchanged)
- Right side: Group action buttons into logical pairs with subtle separators:
  - Save Selection | Generate Link
  - Print Preview | View Items | View All Links

**3. Table Visual Enhancement (lines ~4310-4455)**

Upgrade the table with modern styling while keeping all columns and data intact:

- **Header**: Stronger background with uppercase letter-spaced labels, bottom shadow for depth
- **Rows**: Alternating subtle row backgrounds (zebra striping), improved hover states with left border accent on hover
- **Checkbox column**: Use actual Checkbox component from radix instead of Square/CheckSquare icons
- **PO Number column**: Slightly larger font weight, country flag and PO number tighter layout
- **Ship To column**: Add a small MapPin icon prefix for visual consistency
- **Items + Quantity columns**: Merge into a single "Size" column showing "605 items / 13,100 qty" to reduce column count
- **Actions column**: Consolidate print status badge and print button into a cleaner cell with the progress shown as a mini progress bar instead of "0/605 Printed" text
- **Row selection glow**: Brighter primary accent on selected rows

### Technical Details

**File: `src/components/POTracker.tsx`**

- Lines ~4164-4233: Restructure toolbar div layout, wrap location controls in a bordered group
- Lines ~4236-4307: Add flex-wrap and gap separators between action button groups
- Lines ~4310-4455: Update Table styling classes:
  - TableHeader: stronger bg, uppercase text-[11px] tracking-wider
  - TableRow: add even/odd striping via `even:bg-muted/20`
  - Merge Items + Quantity into one cell
  - Replace Square/CheckSquare icons with Checkbox component
  - Add mini progress bar (div with width%) for print status
  - Add MapPin icon to Ship To cell

No new files, no new dependencies -- purely styling and layout reorganization within the existing component.

