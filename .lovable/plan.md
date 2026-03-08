

# Fix Webhook & Add Connection Testing

## Problem Found
I tested the webhook endpoint and found a database error: the `noon_fbpi_orders` table is missing a unique constraint on `fbpi_order_nr`, which the upsert operation requires. I also deployed both edge functions (`noon-fbpi` and `noon-fbpi-webhook`) which were not yet deployed.

## What Needs to Change

### 1. Database Migration
Add a unique constraint on `noon_fbpi_orders.fbpi_order_nr` so the webhook upsert works.

### 2. Add "Send Test Webhook" Button to Settings
Add a button in the webhook section of `FBPISettings.tsx` that sends a test payload to the webhook endpoint using the active API key. This lets you verify the connection is working without needing external tools. The test will:
- Send a sample FBPI order with test SKUs
- Show success/failure result inline
- The test order will appear in the Orders tab confirming end-to-end connectivity

### 3. Add Webhook Log / Last Received Indicator
Show a "Last received" timestamp in the webhook section so you can see at a glance whether orders are coming through.

## Files to Modify
- **Migration**: Add unique constraint on `noon_fbpi_orders.fbpi_order_nr`
- **Edit**: `src/components/noon-fbpi/FBPISettings.tsx` — add "Test Webhook" button and last-received indicator
- **Edit**: `src/hooks/useNoonFBPI.ts` — add test webhook function

