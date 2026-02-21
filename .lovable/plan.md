

## Market Purchases UI Redesign — Clean, Organized, and Advanced

### Overview
Redesign the entire Market Purchases page with a polished, professional layout that matches the app's existing design language (gradient accents, card-based layouts, clean typography). The current UI is functional but plain — this redesign makes it visually organized, scannable, and modern.

---

### Page Header Redesign
- Replace the plain text header with a gradient-accented hero section (matching the app's gold-to-blue gradient style)
- Add a decorative icon with subtle glow effect
- Include a quick-stats bar showing: Total Items Today, Outstanding Credit, Pending Bills — as inline metric pills

### Tab Bar Improvements
- Styled tab triggers with icon + label, hover/active states with subtle underline animation
- Active tab gets a filled background with primary color accent
- Responsive: on smaller screens, tabs scroll horizontally

---

### Tab-by-Tab Redesign

#### 1. Daily Orders Tab
**Current**: Basic date picker + flat cards + plain table
**Redesigned**:
- Date picker in a compact toolbar strip with "Today" quick-select button and date navigation arrows (prev/next day)
- Platform summary as two compact metric cards with colored left borders (orange for Amazon, yellow for Noon) showing item count and estimated cost
- Grand total as a highlighted banner below the cards
- Table with zebra striping, sticky header, and platform badges using colored dots instead of text-only badges
- "Generate Purchase Link" button promoted to a more visible position with an accent style
- Empty state with illustration and helpful text

#### 2. Purchase Log Tab
**Current**: Toolbar with many inline filters + basic table
**Redesigned**:
- Compact filter bar: group filters into a collapsible "Filters" section that expands on click (keeps the toolbar clean by default)
- "New Purchase" button as a prominent primary action button
- Purchase count + total value summary shown in a subtle info bar
- Table rows with:
  - Color-coded left border by platform (orange=Amazon, yellow=Noon, blue=Both, purple=PO)
  - Improved expanded row styling with indented item cards instead of a nested table
  - Status badges with filled backgrounds and subtle icons
- Delete confirmation before removing purchases

#### 3. Item Costs Tab
**Current**: Basic toolbar + plain table
**Redesigned**:
- Summary stats row: "X items tracked", "Avg cost: AED X.XX", "Last updated: date"
- Search bar with icon, properly sized
- Table with:
  - Alternating row colors
  - Source badges with distinct icons (manual = pencil, link = chain, purchase = cart)
  - Inline edit with a cleaner input that auto-focuses and has save/cancel buttons
  - Hover-reveal action buttons instead of always-visible
- Empty state with a call-to-action card showing both "Add Cost" and "Upload CSV" as prominent options

#### 4. Credit Balances Tab
**Current**: Already decent with cards — needs minor polish
**Redesigned**:
- Summary banner with gradient background and larger typography
- Supplier cards with:
  - Subtle shadow and rounded corners
  - Progress-like indicator showing aging visually (thin colored bar at top of card)
  - Cleaner internal layout with aligned metrics
  - Hover lift effect with shadow increase
- Grid responsive: 1 col mobile, 2 col tablet, 3 col desktop (already done, just polish)

#### 5. Bill Reconciliation Tab
**Current**: Basic table + reconcile dialog
**Redesigned**:
- Summary bar: "X pending bills", "X reconciled", "Total outstanding: AED X"
- Table with status icons more prominent (colored dot + text)
- Reconcile button with a distinctive accent color
- Reconcile dialog:
  - Three metric cards at top with larger, bolder numbers
  - Variance card with animated color transitions
  - Cleaner purchase selection with card-style rows instead of table rows
  - Action buttons with clearer hierarchy (primary = Reconcile, secondary = Partial, destructive = Disputed)

---

### Technical Details

**Files to modify:**

1. **`src/pages/MarketPurchases.tsx`** — New header with gradient accent, quick-stats bar, improved tab styling
2. **`src/components/market-purchases/DailyOrdersTab.tsx`** — Date navigation, metric cards with borders, table zebra striping, better empty state
3. **`src/components/market-purchases/PurchaseLogTab.tsx`** — Collapsible filters, platform-colored borders, improved expanded rows, summary bar
4. **`src/components/market-purchases/ItemCostsTab.tsx`** — Stats row, hover-reveal actions, improved empty state, source icons
5. **`src/components/market-purchases/CreditBalanceTab.tsx`** — Card polish with top color bars, better summary banner
6. **`src/components/market-purchases/BillReconciliationTab.tsx`** — Summary stats bar, improved reconcile dialog layout

**No database changes needed** — this is purely a UI/visual redesign.

**Design principles applied:**
- Consistent spacing (using Tailwind's spacing scale)
- Color-coded platform identification throughout (orange=Amazon, yellow=Noon, blue=Both, purple=PO)
- Card-based layouts where data density is moderate
- Tables with zebra striping and sticky headers for data-heavy views
- Action buttons with clear visual hierarchy
- Empty states with helpful guidance
- Responsive at all breakpoints

