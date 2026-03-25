

# Theme Overhaul: RCFinder-Style Design

## What Changes

Transform the current amber/gold theme with light sidebar into a modern dark-sidebar + purple/indigo accent theme inspired by rcfinder.lovable.app.

**No features or functionality will be changed** — only visual styling.

## Visual Differences

```text
CURRENT                          TARGET (rcfinder-style)
─────────────────────────────    ─────────────────────────────
Light beige sidebar              Dark navy/indigo sidebar
Amber/gold primary (#D4A017)     Indigo/purple primary (#6366f1)
Warm beige background            Clean light gray background
Gold gradients                   Subtle purple accents
Light card borders               White cards with soft shadows
```

## Changes by File

### 1. `src/index.css` — Color System (CSS Variables)

**Light mode `:root`:**
- `--background`: Change from warm beige (`60 4% 95%`) to clean light gray (`220 14% 96%`)
- `--foreground`: Keep dark for contrast
- `--card`: Pure white (`0 0% 100%`)
- `--primary`: Indigo (`239 84% 67%`) instead of amber
- `--primary-foreground`: White
- `--accent`: Soft indigo tint
- `--ring`: Match primary indigo
- `--border`: Cool gray instead of warm
- `--muted`: Cool gray tones

**Sidebar variables (light mode):**
- `--sidebar-background`: Dark navy (`232 47% 15%`) — the key rcfinder look
- `--sidebar-foreground`: White (`0 0% 100%`)
- `--sidebar-primary`: Lighter indigo for active items
- `--sidebar-accent`: Navy highlight for hover
- `--sidebar-border`: Dark navy border

**Dark mode `.dark`:**
- Similar adjustments, keeping the dark sidebar consistent
- Primary stays indigo-toned

**Gradients:** Update `--gradient-primary` to use indigo tones

### 2. `src/components/AppSidebar.tsx` — Sidebar Styling

- Active state: Change from `bg-primary/90` to a lighter indigo highlight style matching rcfinder (`bg-white/10` or `bg-indigo-500/20` with white text)
- Hover state: Subtle `bg-white/5` instead of current accent-based hover
- Section group labels: Lighter opacity white text
- Footer: Match dark sidebar styling
- The collapsible sections and navigation structure stay exactly the same

### 3. `src/App.tsx` — Top Header Bar

- Header background: Keep clean white (`bg-background`)  
- No structural changes, just inherits new color variables

### 4. `src/hooks/useAccentTheme.ts` — Default Theme

- Change default theme from `Blue` to match the new indigo primary so the accent theme widget stays consistent

### 5. `src/components/ui/huha-header-01.tsx` — Page Headers

- Check if page headers use hardcoded gradient colors and update to use CSS variable-based gradients (indigo tones)

### What stays the same
- All navigation items, routes, permissions logic
- All page components and their features
- Collapsible sidebar sections
- Theme configuration system (ThemeConfigContext)
- Dark mode toggle
- All database/API interactions
- Every feature on every page

## Files Modified
- `src/index.css` — CSS variables for colors, sidebar, gradients
- `src/components/AppSidebar.tsx` — Sidebar active/hover styling classes
- `src/App.tsx` — Minor header class adjustments if needed
- `src/hooks/useAccentTheme.ts` — Default accent color

