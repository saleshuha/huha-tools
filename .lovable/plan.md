

## Amazon Fulfillment Tracker - Advanced Overhaul

### 1. Settings Dialog for Country Configuration

Create a new **Settings dialog** accessible from the header with a gear icon. This dialog will allow editing `payment_terms` for both UAE and KSA directly from the UI:

- **Credit Days**: Editable number input per country (currently hardcoded UAE=60, KSA=45)
- **VAT Rate**: Editable percentage per country
- **Currency**: Display currency per country
- Save changes back to the `payment_terms` table in Supabase

**File**: New `src/components/amazon/PaymentSettingsDialog.tsx`
**Edit**: `src/pages/AmazonFulfillmentTracker.tsx` - add Settings button to header actions

---

### 2. Restructured Page Layout (3 Tabs)

Upgrade from 2 tabs to **3 tabs** for better organization:

- **Dashboard** - Metrics cards + charts (existing, cleaned up)
- **Orders** - Orders table with advanced filters (existing, enhanced)  
- **Settings** - Inline settings panel for payment terms, currency rates, and preferences

**File**: Edit `src/pages/AmazonFulfillmentTracker.tsx`

---

### 3. Advanced Filters on Orders Table

Add new filter capabilities to `OrdersTable.tsx`:

- **Date range filter** for shipment dates
- **Warehouse code filter** dropdown (populated from existing data)
- **ASIN/SKU quick filter** toggle
- **Amount range filter** (min/max cost)
- **Overdue only** toggle button
- **Collapsible advanced filters** section (show/hide to keep it clean)
- Reset all filters button

**File**: Edit `src/components/amazon/OrdersTable.tsx`

---

### 4. Dashboard Cleanup and New Widgets

Clean up the 853-line `MetricsDashboard.tsx` and add:

- **Payment Aging Summary**: A horizontal stacked bar showing distribution by age brackets (0-30, 30-60, 60-90, 90+ days overdue)
- **Collection Rate KPI**: Percentage of total value collected vs. outstanding
- **Average Days to Payment**: How long on average it takes to get paid
- **Top ASINs by Unpaid Value**: Quick list of the most expensive unpaid products
- Remove excessive `console.log` debug statements cluttering the code
- Extract the inline date-range payment calculation (lines 722-843) into a cleaner sub-component

**Files**: Edit `src/components/amazon/MetricsDashboard.tsx`, new `src/components/amazon/PaymentAgingChart.tsx`

---

### 5. Bulk Actions on Orders Table

Add a selection column and bulk action toolbar:

- **Select All / Select Page** checkbox
- **Bulk Mark as Paid**: Set selected orders to status "Paid"
- **Bulk Export Selected**: Export only selected rows
- Selection count indicator

**File**: Edit `src/components/amazon/OrdersTable.tsx`

---

### 6. Visual Polish

- Remove hardcoded credit days text (line 439: `Past 60-day / 45-day`) and use dynamic `creditDays` value
- Clean up all `console.log` debug statements from `useAmazonOrders.ts` and `MetricsDashboard.tsx`
- Add subtle row hover highlighting and alternating row colors to Orders table
- Consistent card sizing and spacing across the dashboard

**Files**: Edit `src/hooks/useAmazonOrders.ts`, `src/components/amazon/MetricsDashboard.tsx`

---

### Technical Summary

| Change | Files |
|--------|-------|
| Payment Settings Dialog | New `PaymentSettingsDialog.tsx`, edit `AmazonFulfillmentTracker.tsx` |
| 3-Tab Layout + Settings tab | Edit `AmazonFulfillmentTracker.tsx` |
| Advanced Filters | Edit `OrdersTable.tsx` |
| Dashboard new widgets | Edit `MetricsDashboard.tsx`, new `PaymentAgingChart.tsx` |
| Bulk Actions | Edit `OrdersTable.tsx` |
| Cleanup & Polish | Edit `useAmazonOrders.ts`, `MetricsDashboard.tsx` |

No database schema changes needed - the `payment_terms` table already has all required columns (credit_days, vat_rate, currency) for both countries.

