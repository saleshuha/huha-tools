

## Performance Column - Simplified Confident Design

### Problem
The current cell is too noisy — tiny 3-bar sparklines, trend arrows, infinity symbols, and decimal velocities all crammed into ~100px creates visual clutter that's hard to parse at a glance. "210.0/d∞7d30d90dP" is unreadable.

### New Design: Clean Two-Row Cell

A minimal, scannable layout that communicates confidence clearly:

```text
+----------------------------+
| Excellent         82/100   |  <- Category word + score
| ██████████░░░  1.2/day     |  <- Score bar + velocity
+----------------------------+
```

**Row 1**: Full category word (not a letter) in its category color + numeric score as muted text.
**Row 2**: A thin color-coded progress bar + the 30d velocity as "X.X/day".

That's it. No sparklines, no trend bars, no runway badge, no single-letter badges. All the extra detail (7d/30d/90d breakdown, stock runway, trend direction, turnover, restocks) stays in the **hover tooltip** where it belongs.

### Why This Works
- One glance tells you: "Good, 68/100, selling 0.8/day" — that's confident and explainable
- The bar gives a visceral sense of where the product sits on the 0-100 scale
- Color reinforces meaning without needing to read text
- No abbreviations or symbols to decode

### Tooltip (unchanged)
The rich tooltip stays exactly as-is — it already has well-organized sections for trend, velocity breakdown, stock metrics, and turnover. That's the detail layer for users who want to dig deeper.

### Technical Changes

**File: `src/components/inventory/PerformanceIndicator.tsx`** (simplify)
- Remove `VelocityTrendBars` component entirely
- Remove `TrendArrow` component from the cell (keep in tooltip only)
- Remove `RunwayBadge` component from the cell (keep stock days in tooltip only)
- Remove the single-letter `CategoryBadge` from the cell
- Simplify the main cell to just two rows:
  1. Category name (left-aligned, colored) + score number (right-aligned, muted)
  2. Thin progress bar (full width, colored by category) + velocity text
- Keep the full enhanced tooltip exactly as it is now
- Legacy fallback simplified to match the same two-row layout

