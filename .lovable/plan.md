

# ASIN Sales Health Tracker — Monthly Sales Analysis System

## Overview
A new system to upload monthly Amazon shipping data per ASIN, track sales trends over time, detect declining/inactive ASINs, and lock months after upload to prevent duplicates.

## Database Design

### Table: `amazon_monthly_sales`
Stores the raw monthly shipped quantities per ASIN.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| asin | text NOT NULL | |
| sku | text | |
| title | text | |
| country | text NOT NULL | UAE/KSA |
| year | integer NOT NULL | e.g. 2025 |
| month | integer NOT NULL | 1-12 |
| shipped_qty | integer NOT NULL | total shipped that month |
| created_at | timestamptz | default now() |
| UNIQUE | | (user_id, asin, country, year, month) |

### Table: `amazon_monthly_upload_locks`
Tracks which months have been uploaded/locked.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| country | text NOT NULL | |
| year | integer NOT NULL | |
| month | integer NOT NULL | |
| total_asins | integer | count of ASINs uploaded |
| total_qty | integer | total shipped qty |
| locked_at | timestamptz | default now() |
| UNIQUE | | (user_id, country, year, month) |

RLS: Both tables — authenticated users can CRUD their own rows (`user_id = auth.uid()`).

## Frontend Architecture

### New Page: `src/pages/AsinSalesHealth.tsx`
Route: `/asin-sales-health`

### Components: `src/components/asin-sales-health/`

1. **MonthlyUploadPanel** — File upload for monthly data (Excel/CSV with ASIN + shipped qty columns), month/year selector, column mapping, preview before save, lock month after upload
2. **UploadCalendar** — Visual grid showing which months are uploaded (locked) vs pending, with country filter
3. **SalesHealthDashboard** — Analytics view with:
   - Health status per ASIN: Growing / Stable / Declining / Inactive / New
   - Trend calculation: compare recent 3 months vs prior 3 months
   - Sortable/filterable table showing all ASINs with monthly breakdown
   - Color-coded health indicators
4. **AsinTrendChart** — Sparkline or bar chart per ASIN showing monthly qty over time
5. **HealthSummaryCards** — KPI cards: Total Active ASINs, Declining count, Inactive count, Top Growers

### Health Classification Logic (client-side)
- **Growing**: Recent 3-month avg > Prior 3-month avg by >20%
- **Stable**: Within ±20%
- **Declining**: Recent 3-month avg < Prior 3-month avg by >20%
- **Inactive**: 0 sales in last 2+ months but had sales before
- **New**: Only appeared in recent months

### Hook: `useAsinSalesHealth.ts`
- Fetch monthly data from `amazon_monthly_sales`
- Fetch lock status from `amazon_monthly_upload_locks`
- Calculate health metrics client-side
- Upload handler with lock creation

## Navigation
Add sidebar entry under Amazon section: "ASIN Sales Health" with `Activity` icon

## Files to Create/Modify
- **Create**: `src/pages/AsinSalesHealth.tsx`
- **Create**: `src/components/asin-sales-health/MonthlyUploadPanel.tsx`
- **Create**: `src/components/asin-sales-health/UploadCalendar.tsx`
- **Create**: `src/components/asin-sales-health/SalesHealthDashboard.tsx`
- **Create**: `src/components/asin-sales-health/AsinTrendChart.tsx`
- **Create**: `src/components/asin-sales-health/HealthSummaryCards.tsx`
- **Create**: `src/hooks/useAsinSalesHealth.ts`
- **Modify**: `src/App.tsx` — add route
- **Modify**: `src/components/AppSidebar.tsx` — add nav entry
- **DB Migration**: Create both tables with RLS

