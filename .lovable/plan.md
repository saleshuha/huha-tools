

## Unify UI Design Pattern Across All Market Purchases Tabs

### Current Inconsistencies

After reviewing all 5 tabs, here are the design pattern differences:

| Component | Daily Orders | Purchase Log | Item Costs | Credit Balances | Bill Reconciliation |
|-----------|-------------|-------------|-----------|----------------|-------------------|
| **Stats** | Compact horizontal bar | Compact horizontal bar | 3 separate Card grid | Gradient hero section | Compact horizontal bar |
| **Toolbar** | Card wrapper (rounded-xl bg-card border) | Card wrapper | Card wrapper | Bare flex, no wrapper | Card wrapper |
| **Data Table** | Native `<table>` with rounded-xl wrapper | Native `<table>` | Native `<table>` | Card grid (OK - different data) | Shadcn `<Table>` component |
| **Table Header** | `bg-muted/40`, uppercase, tracking-wider | Same | Same | N/A | Same style but uses `<TableHead>` |
| **Row Styling** | Alternating `bg-muted/10`, hover | Same | Same | N/A | Alternating + left border |
| **Footer** | Grand total row `bg-primary/5` | Same | None | N/A | None |
| **Mobile Cards** | Custom card layout | Custom card layout | None (no mobile) | N/A | None (no mobile) |
| **Empty State** | Centered icon + text | Same | Same + action buttons | Same | Same |

### Unified Design Standard (Based on Daily Orders + Purchase Log pattern)

Every tab will follow this structure top-to-bottom:

1. **Compact Stat Bar**: Horizontal pill-style metrics inside `p-2.5 rounded-xl bg-card border border-border`, with colored dots and a highlighted total on the right
2. **Toolbar**: Wrapped in `p-3 rounded-xl bg-card border border-border`, containing action buttons, filters, search input, and item count
3. **Data Table** (desktop): Native `<table>` inside `border border-border rounded-xl overflow-hidden bg-card`, header row `bg-muted/40`, uppercase `text-xs` headers, alternating rows with `bg-muted/10`, hover `bg-muted/20`
4. **Mobile Cards**: `md:hidden` card layout for all tabs
5. **Empty State**: Centered with `h-14 w-14 rounded-2xl bg-muted/50` icon container
6. **Loading**: Centered spinner with text

### Changes Per Tab

#### Item Costs Tab
- Replace the 3 separate stat cards with a compact horizontal stat bar (Items Tracked, Avg Cost, Last Updated, Total)
- No other changes needed -- toolbar and table already match

#### Credit Balances Tab
- Replace the gradient hero summary section with a compact stat bar (Outstanding, Paid, Total Credit, Suppliers count)
- Wrap the filter toolbar (supplier dropdown, sort, show settled) inside a card container matching other tabs
- Keep the supplier cards grid as-is (cards are appropriate for this data type)
- Wrap the recent payments collapsible in consistent styling

#### Bill Reconciliation Tab
- Replace shadcn `<Table>/<TableHead>/<TableRow>/<TableCell>` with native `<table>/<thead>/<tr>/<th>/<td>` to match other tabs exactly
- Add mobile card layout (`md:hidden`) for bills on small screens
- Keep all functionality (reconcile, detail, delete) intact

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/market-purchases/ItemCostsTab.tsx` | Replace 3 Card stat grid (lines 132-166) with compact horizontal stat bar |
| `src/components/market-purchases/CreditBalanceTab.tsx` | Replace gradient hero (lines 230-268) with compact stat bar; wrap filter toolbar (lines 271-306) in card container |
| `src/components/market-purchases/BillReconciliationTab.tsx` | Replace shadcn Table components with native table elements; add mobile card layout for bills |

All features, logic, dialogs, and functionality remain 100% intact -- only the visual containers and layout patterns change.

