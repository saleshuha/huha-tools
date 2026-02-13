

## Enhance Smart Stock Receiving Page -- Advanced UI & Organization

### Overview

Restructure the entire ReceiveStock page into a cleaner, more professional layout with better visual hierarchy, modern card-based dashboard metrics, improved component organization, and polished UI across all sections.

### 1. Dashboard Metrics Bar (New Component)

Create a new `ReceivingDashboard` component that replaces the plain text header with a compact, visually rich stats bar.

**File: `src/components/stock-receiving/ReceivingDashboard.tsx`** (NEW)

- Display 4 metric cards in a responsive grid:
  - "Total POs" -- count from PriorityPOList data
  - "Items Received Today" -- from receiving history (today's count)
  - "Pending" -- POs still in pending status
  - "Groups" -- active PO groups count
- Each card has an icon, value, label, and subtle accent color
- Use compact design with `grid grid-cols-2 md:grid-cols-4 gap-3`
- Subtle gradient backgrounds per card (green for received, orange for pending, blue for POs, purple for groups)

### 2. Restructured Page Layout

**File: `src/pages/ReceiveStock.tsx`**

- Replace the plain `h1`/`p` header with the new `ReceivingDashboard` component
- Restructure into clear visual sections with consistent spacing:
  1. **Top**: Dashboard metrics (compact)
  2. **Main**: Search/Receive card (prominent, always visible)
  3. **Middle**: PO Groups & Priority (collapsible, cleaner design)
  4. **Bottom**: Receiving History (collapsible, already done)
- Remove the connection status section (line 583-584, currently empty/unused)
- Remove the activity summary section (line 586-587, currently just a boolean expression with no output)
- Add subtle section dividers and consistent `gap-6` spacing

### 3. Enhanced Search Card

**File: `src/pages/ReceiveStock.tsx`** (Search Section, lines 590-760)

- Redesign the "Receive Items" card with a more prominent search area:
  - Larger search input with better placeholder text
  - Add a subtle animated border glow when focused
  - Move "Print Settings" into a settings icon button that opens a sheet/drawer instead of inline collapsible (cleaner)
- Add a status indicator dot next to the card title showing connection status (green dot = connected, red = error)

### 4. Improved PriorityPOList Component

**File: `src/components/stock-receiving/PriorityPOList.tsx`**

- Cleaner card design for individual PO items:
  - Remove duplicate search bars (currently search appears in both Priority tab AND Group tab -- lines 320-329 and 530-539). Consolidate into a single search at the top of the card, shared across tabs
  - Better badge styling with consistent color coding
  - Add subtle left border color based on priority (red for 1, orange for 2, blue for 3, etc.)
  - Improve the "Select All" bar styling
- Cleaner group cards in the Group Management tab:
  - Better visual hierarchy for group name, member count, and PO numbers
  - Priority selector styled as segmented buttons instead of dropdown
  - Delete button with better confirmation UX (use AlertDialog instead of `confirm()`)
- Add item count badges to tab triggers ("Priority (44)" and "Groups (2)")
- Virtualize the PO list for performance when 1000+ items exist

### 5. Enhanced QuantityConfirmDialog

**File: `src/components/stock-receiving/QuantityConfirmDialog.tsx`**

- Cleaner layout with better visual grouping:
  - Item info section with product image (fetch from product_images table)
  - PO allocation section with cleaner progress bars
  - Input section with larger, more touch-friendly quantity input
  - Summary footer with total stats
- Better color scheme for "Already Printed" vs "Still Pending" sections
- Add a quick "+1", "+5", "+10" quantity button row for faster input

### 6. Enhanced HistoryItemCard

**File: `src/components/stock-receiving/HistoryItemCard.tsx`**

- Add subtle left border color based on type (green for PO fulfillment, blue for inventory)
- Better timestamp formatting with relative time as primary, absolute as tooltip
- Cleaner badge layout with consistent sizing

### 7. Visual & Styling Improvements (across all files)

- Consistent use of `rounded-xl` for main cards, `rounded-lg` for inner elements
- Add subtle `shadow-sm hover:shadow-md` transitions on interactive cards
- Use `bg-gradient-to-br` subtle gradients for section backgrounds
- Consistent icon sizing (w-5 h-5 for section headers, w-4 h-4 for inline)
- Better mobile responsiveness:
  - Stack PO item details vertically on mobile
  - Full-width buttons on mobile
  - Compact metrics grid (2 cols on mobile, 4 on desktop)
- Replace `confirm()` calls with proper AlertDialog components

### Technical Details

**New files:**
- `src/components/stock-receiving/ReceivingDashboard.tsx` -- Dashboard metrics component

**Modified files:**
- `src/pages/ReceiveStock.tsx` -- Restructured layout, removed dead code, integrated dashboard
- `src/components/stock-receiving/PriorityPOList.tsx` -- Consolidated search, priority color borders, AlertDialog for delete, virtualized list, tab counts
- `src/components/stock-receiving/QuantityConfirmDialog.tsx` -- Quick quantity buttons, product image, cleaner layout
- `src/components/stock-receiving/HistoryItemCard.tsx` -- Left border color coding, better timestamp display
- `src/components/stock-receiving/ItemSearchBar.tsx` -- Subtle styling refinements to dropdown results

**No functionality removed** -- all features (PO matching, group management, priority system, print settings, history, search) remain intact. Only the visual presentation and organization are enhanced.

