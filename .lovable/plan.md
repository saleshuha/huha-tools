
## Performance Column - Advanced Visual Redesign

### Current State
The performance column currently shows a simple 5-dot rating + category label + total sold count. While functional, it underutilizes the rich data already available from the `get_comprehensive_performance_analysis` database function (velocities across 7d/30d/90d, turnover ratio, stock days remaining, sellout time, etc.).

### New Design: Compact Multi-Signal Performance Cell

Replace the simple dots with a **stacked micro-dashboard** that fits in the table cell, showing confidence-based performance at a glance.

**Cell Layout (vertical stack, ~80px wide):**

```text
+---------------------------+
| [Score Bar ██████░░ 72%]  |  <- Colored progress bar with score
| ▲ 2.1/day   47d left     |  <- Velocity + stock runway
| 7d ██ 30d ███ 90d █      |  <- Sparkline-style velocity trend
+---------------------------+
```

**Key visual elements:**
1. **Score Bar**: A thin colored progress bar (0-100%) with the category color (emerald/blue/amber/red). Shows the score number on hover.
2. **Velocity + Runway Row**: Current 30d velocity as units/day, plus stock days remaining (or a warning icon if < 7 days).
3. **Velocity Trend Bars**: Three tiny inline bars comparing 7d vs 30d vs 90d velocity - instantly shows if the product is trending up or down.
4. **Category Badge**: Small colored pill at the top-right corner (E/G/A/P) for quick scanning.

**Tooltip on hover** remains but gets enhanced:
- All existing metrics (total sold, velocity, stock days, turnover)
- Added: Trend direction indicator (7d vs 30d comparison)
- Added: Avg days to sellout
- Added: Days in inventory
- Added: Total restocked units

### Technical Changes

**File: `src/components/inventory/PerformanceIndicator.tsx`** (full rewrite)
- Replace `DotRating` with `ScoreBar` - a thin progress bar using the `Progress` component or a custom div
- Add `VelocityTrend` - three tiny bars showing 7d/30d/90d relative velocity
- Add trend arrow (up/down/flat) by comparing 7d velocity to 30d velocity
- Stock runway with color coding: green (30+ days), amber (7-30 days), red (<7 days), infinity symbol if null
- Category micro-badge in corner: single letter (E/G/A/P) with colored background
- Enhanced tooltip with all available metrics in organized sections

**No other files need changes** - the data is already passed correctly from `AsinInventory.tsx` via `performanceMap`.
