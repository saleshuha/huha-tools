

## Plan: Redesign Print Labels UI to Match Unified Design System

### Summary
Replace the heavy animated gradient styling in the Print Labels tab with the clean, consistent design pattern used across Market Purchases and the recently updated PO Tracker tabs. Uses `CompactStatBar`, `ToolbarBar`, and `DataTableWrapper` components. Zero functional changes.

### Section-by-Section Changes

**1. Header (lines 4692-4784)**
Current: Animated gradient background with blur circles, icon glows, bounce animations, `animate-float`, `animate-slide-in-left/right`.
New: Clean `rounded-xl bg-card border border-border` container. Back button as simple `variant="outline" size="sm"`. Title with standard icon box (`h-10 w-10 rounded-lg bg-primary/10 border border-primary/20`). Quick stats as inline pills matching `CompactStatBar` item styling.

**2. Print Settings Panel (lines 4787-5330)**
Current: `bg-card/50 backdrop-blur-sm border-border/20 shadow-sm rounded-xl` with gradient headers.
New: Simple `rounded-xl bg-card border border-border` card. Collapsed bar uses `ToolbarBar` pattern. Inner sub-tabs for Template/Quality/Advanced use the standard `bg-muted/50 rounded-xl` tab styling (matching the main 7-tab pattern). Remove `backdrop-blur`, `shadow-glow`, `animate-fade-in` throughout.

**3. Metrics Dashboard (lines 5414-5557)**
Current: 6 large animated gradient cards with blur circles, hover lifts, stagger animations, shimmer effects.
New: Replace entire grid with `CompactStatBar` showing: Total (items + units), Printed (items + units), Pending (items + units), Partial (items), Sunsky (matched count), Progress (percentage). Same data, compact horizontal pills.

**4. Search & Filters (lines 5559-5956)**
Current: Two separate rows -- search options panel + main search input, then filter pills row. Heavy gradient backgrounds.
New: Wrap in two `ToolbarBar` containers:
- **Toolbar 1**: Search type select + chip mode + main search input (keep tag-based search behavior)
- **Toolbar 2**: All filter groups (Print Status, Source, Fulfillment, In Stock) with their Print Preview buttons. Use `flex-wrap` for responsive layout. Remove gradient backgrounds, keep the filter logic.

**5. Items Table (lines 5959-7152)**
Current: `rounded-2xl border-border/30 shadow-lg bg-gradient-to-b` with gradient header, colored dot indicators per column, heavy row hover effects.
New: Wrap in `DataTableWrapper`. Apply `dataTableHeaderClass` to `TableHeader`. Apply `dataTableHeadClass` to each `TableHead`. Apply `dataTableRowClass(index)` to each row. Remove:
- Gradient backgrounds on headers
- Colored dot indicators before column names
- `bg-gradient-to-r hover:from-primary/10 hover:to-accent/10` row effects
- `shadow-lg`, `backdrop-blur`, animated checkbox scaling
Keep: All cell content, badges, popovers, action buttons unchanged.

**6. Pagination (lines 7155-7197)**
Current: Custom pagination with gradient backgrounds and decorative dots.
New: Use `DataTableFooter` wrapper. Simple `Previous | 1 2 3 | Next` with standard button styling. Remove gradient backgrounds and decorative elements.

### Files to Modify
1. `src/components/POTracker.tsx` -- Lines 4690-7200 (Print Labels tab content only)

### What Stays Exactly the Same
- All state management (selectedForPrint, customPrintQuantities, searchTags, etc.)
- All filter logic (print status, source, fulfillment, in-stock, barcode)
- All button click handlers (handleDirectPrint, handleSingleItemPrint, handleReprintWithoutTracking, etc.)
- All cell content (image popovers, SKU/model badges, stock qty logic, print status badges, barcode display, action buttons)
- All dialog/modal interactions
- QZ Tray connection logic
- Print settings configuration (template, DPI, darkness, copies)
- Tag-based search with chip mode
- Consolidation logic for multi-PO selection
- Sorting and pagination logic

