

## Inventory Table - Advanced UI Redesign

### Goal
Modernize the inventory table for better visual clarity, density, and professional polish while keeping all existing functionality (sorting, selection, restock/export toggles, performance, actions) intact.

### Key Visual Changes

**1. Sticky Glassmorphism Header**
- Make the table header sticky so it stays visible while scrolling
- Apply a frosted-glass backdrop-blur effect with subtle border-bottom glow
- Reduce header text size and use uppercase tracking for a cleaner look
- Add subtle column separator lines instead of heavy borders

**2. Row Redesign - Card-Like Rows**
- Remove all internal cell borders (`border-r`) for a cleaner horizontal flow
- Add alternating row backgrounds with very subtle tint (`even:bg-muted/20`)
- Replace heavy `border-b` with a thin hairline separator
- Add a left accent color bar on each row based on status (green = in stock, red = out of stock, yellow = low stock, gray = disabled)
- Smooth hover effect with slight left-shift of the accent bar

**3. Product Info Column - Enhanced Layout**
- Larger product image thumbnail (40x40 with rounded corners)
- Title limited to 2 lines with text-ellipsis
- ASIN and SKU as inline compact pills/badges instead of plain text
- Disabled badge integrated more subtly (muted red background instead of pulsing)

**4. Quantity Column - Visual Gauge**
- Replace plain number with a mini radial/circular indicator or a small colored pill
- Color gradient: red (0) -> yellow (1-5) -> green (6+)
- Show the number centered inside the colored pill

**5. Status Column - Refined Badges**
- Smaller, rounder badges with dot indicator prefix (colored dot + text)
- Consistent color scheme across all statuses

**6. Restock & Export Columns - Compact Toggle**
- Remove verbose description text below each switch
- Show only the switch + short label ("Eligible" / "Not Eligible")
- Move the description text into a tooltip on hover instead
- This saves significant vertical space per row

**7. Performance Column - Already Redesigned**
- Keep the new multi-signal performance indicator as-is

**8. Actions Column - Icon-Only Compact Bar**
- Replace text buttons with icon-only buttons in a tight horizontal group
- Use a `ButtonGroup` style with connected borders
- Tooltip on each icon for clarity
- Print button gets a subtle accent if printer is connected

**9. Overall Table Container**
- Rounded-xl container with subtle shadow
- Remove the outer Card wrapper padding for tighter fit
- Add a subtle gradient top-border accent line (2px, primary color fade)

### Technical Details

**Files to modify:**
- `src/components/AsinInventory.tsx` (lines ~1709-2075) - Table markup, row rendering, header styling
- No new files needed
- No data/logic changes - purely visual

**Approach:**
- All changes are CSS/Tailwind class modifications and minor JSX restructuring
- Switch description text moved to `TooltipProvider` / `Tooltip` wrappers
- Row accent bar added as a pseudo-element or a thin `div` at row start
- Sticky header via `sticky top-0 z-10 backdrop-blur-xl bg-background/80`
- Quantity pill using inline styled `span` with dynamic background color

**What stays exactly the same:**
- All sorting logic and handlers
- Checkbox selection behavior
- Restock/Export switch functionality and database calls
- Performance data and indicator
- DualQuantityEditor, StockHistoryDialog, PrintQuantityDialog
- Pagination and all filters
- Grid/card view mode (untouched)

