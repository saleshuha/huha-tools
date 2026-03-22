

# Advanced ASIN Sales Health Classification & Dashboard

## Problem with Current System

The current classification is too simplistic — it uses a basic 20% threshold on 3-month rolling sums and marks anything with 0 recent sales as "inactive", even if a product sold 1 unit 6 months ago (which was never a real performer). The data confirms this:

- **520 ASINs** have 0 total shipped (noise)
- **1,496 ASINs** only sold in 1 month ever (mostly 1 unit)
- Only **~300 ASINs** are consistently active (5+ months)

A product that sold 1 unit once and stopped is not meaningfully "inactive" — it was never active. Conversely, a product selling 20+/month that suddenly stops IS a real concern.

## New Classification Logic

Replace the simple prior/recent comparison with a **multi-factor scoring system**:

### Health Statuses (revised definitions)

| Status | Definition |
|--------|-----------|
| **Star Performer** | High volume (top 20% by avg monthly), consistent activity, growing or stable |
| **Growing** | Positive trend AND meaningful volume (avg > 1/mo over active months) |
| **Stable** | Consistent sales, low variance, no significant trend |
| **Declining** | Was performing well (peak avg > 2/mo) but recent trend is significantly down |
| **At Risk** | Previously active (3+ active months, avg > 1/mo) but 0 sales in last 2+ months |
| **Low Mover** | Sporadic sales, low volume (total < 5 across all time), not worth worrying about |
| **New** | First appeared in last 3 months, not enough history to classify |
| **Dead** | No sales in 4+ months AND was never a strong performer (peak < 3/mo) |

### New Computed Metrics per ASIN

- **`peakMonthlyAvg`**: Best 3-month rolling average (shows the product's potential)
- **`monthsActive`**: Count of months with qty > 0 (consistency indicator)
- **`monthsSinceLastSale`**: Gap since last non-zero month
- **`salesVelocity`**: Total shipped / months since first appearance (overall rate)
- **`volatility`**: Standard deviation of monthly qty (consistency measure)
- **`trendSlope`**: Linear regression slope over last 6 months (direction)
- **`healthScore`**: 0-100 composite score combining all factors

### Classification Algorithm

```text
IF monthsActive <= 2 AND first appeared in last 3 calendar months → "new"
IF total shipped < 5 AND monthsActive <= 2 → "low_mover"
IF monthsSinceLastSale >= 4 AND peakMonthlyAvg < 3 → "dead"
IF monthsSinceLastSale >= 2 AND peakMonthlyAvg >= 3 → "at_risk"
IF in top 20% by salesVelocity AND trendSlope >= 0 → "star"
IF trendSlope > 0.3 AND avg > 1/mo → "growing"
IF trendSlope < -0.3 AND peakMonthlyAvg >= 2 → "declining"
ELSE → "stable"
```

## Dashboard Column Changes

### Remove
- "Prior 3mo" and "Recent 3mo" columns (replaced by better metrics)

### Add New Columns
- **Velocity**: avg units/month (total ÷ months since first sale)
- **Peak**: best 3-month avg (shows product potential)
- **Active**: X of Y months with sales (e.g., "8/16")
- **Gap**: months since last sale (0 = sold this month)
- **Score**: 0-100 health score with color-coded pill
- **Trend**: small slope indicator arrow with numeric value

### Keep
- Product (ASIN/SKU/Title)
- Status badge (updated with new statuses)
- Monthly Shipped sparkline (12mo)
- Δ% change
- Total shipped
- Last Active

## Summary Cards Update

Replace current 6 cards with the new 8 statuses: Total, Star, Growing, Stable, Declining, At Risk, Low Mover, Dead (New can be folded into the filter).

Actually keep it simpler — 6 cards still, but reorganized:
- **Total ASINs** | **Active** (sold in last 2mo) | **Growing** | **Declining** | **At Risk** (was good, now stopped) | **Low/Dead** (combined non-performers)

## Files Modified

- **`src/hooks/useAsinSalesHealth.ts`** — New `HealthStatus` type with 8 values, new computed fields (`peakMonthlyAvg`, `monthsActive`, `monthsSinceLastSale`, `salesVelocity`, `volatility`, `trendSlope`, `healthScore`), new classification algorithm
- **`src/components/asin-sales-health/SalesHealthDashboard.tsx`** — Replace Prior/Recent columns with Velocity, Peak, Active, Gap, Score columns; update STATUS_CONFIG for new statuses; update sorting keys
- **`src/components/asin-sales-health/HealthSummaryCards.tsx`** — Update to reflect new status categories
- **`src/components/asin-sales-health/AsinTrendChart.tsx`** — Update color mapping for new statuses

