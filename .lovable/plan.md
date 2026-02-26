

## Redesign Stock History Dialog as a Clean Ledger/Log View

### Current Issues
- Analytics tab adds complexity without much value for quick stock checks
- Card-based activity feed is visually heavy and hard to scan
- Too many nested tabs (main tabs + sub-tabs)
- Filters take up too much vertical space

### Design: Clean Ledger Table

Replace the current card-based activity feed + analytics tabs with a single clean **ledger table** — similar to an accounting journal or bank statement.

**Layout:**
```text
┌──────────────────────────────────────────────────────┐
│ 📦 Stock Ledger — B0FPBJ1CBC (02158)    [Export][↻] │
│ Current Stock: 5 units  |  Net Change: +3            │
├──────────────────────────────────────────────────────┤
│ [Search...] [Type ▾] [Direction ▾] [Date Range] [User▾] │
├──────────────────────────────────────────────────────┤
│ DATE        │ USER    │ TYPE    │ CHANGE │ BALANCE │ NOTE │
│─────────────┼─────────┼─────────┼────────┼─────────┼──────│
│ Jan 08 15:53│ Zain H. │ Restock │  +1    │   1     │ ...  │
│ Jan 07 10:20│ System  │ PO      │  +2    │   0     │ ...  │
│ ...         │         │         │        │         │      │
└──────────────────────────────────────────────────────┘
```

### Changes

#### 1. `src/components/StockHistoryDialog.tsx` — Major rewrite
- Remove `mainTab` state, `HuhaTab01`, analytics tab, `StockHistoryStats` and `StockHistoryChart` imports
- Remove sub-tabs (All/PO/Restock/B2B) — filter by type dropdown is sufficient
- Add a compact summary bar showing current stock level and net change
- Replace the card list with a `<table>` ledger view
- Each row: date, user (truncated), type badge (compact), change (+/-), running balance, reason (truncated with tooltip)
- Expandable row detail on click (shows notes, metadata, source, cost)
- Keep filters but make them a single compact row

#### 2. `src/components/stock-history/StockHistoryChangeCard.tsx` — Keep as-is (not used in new design, but preserved for backward compat)

#### 3. New: `src/components/stock-history/StockLedgerRow.tsx`
- Table row component for a single stock change entry
- Compact: date | user | type pill | +/- change (green/red) | running balance | reason
- Click to expand inline details (notes, metadata, cost, source)
- Color-coded change amounts: green for increase, red for decrease

### Files
- **Edit**: `src/components/StockHistoryDialog.tsx` — Replace with ledger table layout
- **Create**: `src/components/stock-history/StockLedgerRow.tsx` — Ledger row component
- **Keep**: All other stock-history files unchanged (filters, export still used)

