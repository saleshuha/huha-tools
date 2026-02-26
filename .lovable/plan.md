

## Plan: Align PO Tracker Page UI with Market Purchases Design Pattern

### What Changes
Purely visual/layout changes to match the Market Purchases design pattern. No functional or logic changes.

### Two Areas to Modify

**1. `src/pages/POTrackerPage.tsx` (Page Header)**

Current: Uses `HuhaHeader01` component with separate refresh button and timestamp pill.

Target: Replace with the same "Gradient Hero Header" pattern used in Market Purchases:
- Rounded-xl container with `bg-gradient-to-br from-primary/10 via-card to-sky/10` and decorative blur circles
- Icon in a `h-12 w-12 rounded-xl bg-primary/10 border border-primary/20` box
- Title as `text-2xl font-bold text-foreground`
- Subtitle as `text-muted-foreground text-sm`
- Move the "Hard Refresh" button and "Last updated" timestamp into the header's right side area
- Remove the `HuhaHeader01` import; use standard `p-6 space-y-6` outer wrapper instead of `min-h-screen bg-gradient-surface`

**2. `src/components/POTracker.tsx` (Tabs and Inner Header)**

Current:
- Lines 3535-3542: Internal "Purchase Order Dashboard" heading with `text-2xl font-semibold`
- Lines 3581-3616: TabsList with `bg-background/60 backdrop-blur-md` styling and `data-[state=active]:bg-primary/10` triggers

Target: Match Market Purchases tab styling:
- Remove the internal "Purchase Order Dashboard" h2/p block (since the page header already has it)
- Update TabsList to: `grid w-full grid-cols-7 max-w-5xl h-auto p-1 bg-muted/50 rounded-xl`
- Update each TabsTrigger to: `flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all`
- Use `<span className="hidden sm:inline">` for tab labels (matching Market Purchases responsive pattern)
- TabsContent uses `mt-6` spacing

### Files Modified
1. `src/pages/POTrackerPage.tsx` - Header redesign
2. `src/components/POTracker.tsx` - Tab styling update, remove duplicate header

### What Stays the Same
- All tab content components remain untouched
- All state management, hooks, data fetching unchanged
- All 7 tabs and their functionality preserved
- Hard Refresh logic preserved (just repositioned)
- URL tab syncing preserved
- Loading skeleton preserved

