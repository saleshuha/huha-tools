

## Fix: Source Matching Not Working - Add Live Sunsky API Check

### Root Cause
The current `DFSourceMatchStep` only checks the local `sunsky_skus` database table (1,209 rows). However, the uploaded DF orders use your internal SKUs (e.g., `BURAQSP0207`, `BURAQRRC0038`), which don't exist in the Sunsky catalog table. 

The old system had a **live Sunsky API check** that would call Sunsky's real API with each SKU/ASIN to verify if the product exists in their catalog. This was removed during the rebuild.

### Fix Plan

**File: `src/components/df-processing/DFSourceMatchStep.tsx`**

Rewrite the matching logic to use a **two-pass approach**:

1. **Pass 1 - Local DB match** (fast): Check SKUs against the `sunsky_skus` table (existing logic, keeps working for Sunsky-format SKUs like `EDA004788101A`)

2. **Pass 2 - Live Sunsky API match** (for unmatched items): For any items that didn't match locally, call the `sunsky-api` edge function with the SKU to check Sunsky's live catalog. This reuses the existing `sunsky-api` edge function and the user's stored Sunsky credentials from `sunsky_credentials` table.

**Detailed changes:**

- After the local DB match, collect all items still marked as "other"
- Fetch the user's active Sunsky API credential from `sunsky_credentials` table
- If credentials exist, batch-call the `sunsky-api` edge function (5 items at a time) with `action: 'getProductDetails'` for each unmatched SKU
- If the API returns a match (`code === 200` with `result`), update the item's `sourceStatus` to `'sunsky'` and populate `sunskyCost` from the API response price
- Show a two-phase progress bar: "Checking local catalog..." then "Checking Sunsky API..."
- If no Sunsky credentials are configured, skip the API check and show a note suggesting the user configure credentials

**Progress UX updates:**
- 0-30%: Local DB matching
- 30-100%: Live API checking (increments per item checked)
- Show current item being checked (e.g., "Checking BURAQSP0207...")
- Show running tally: "Found 3 of 17 in Sunsky so far..."

**No other files need changes** - the `sunsky-api` edge function and `sunsky_credentials` table already exist and work correctly from the old implementation.

