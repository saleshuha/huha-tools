

# Multi-File Upload with Deduplication for Amazon Fulfillment Tracker

## Changes

### 1. Multi-File Upload in ImportOrdersDialog
- Change the file input from single to `multiple` file selection
- Store an array of files instead of a single file
- Parse all selected files and merge their rows into one combined preview
- Deduplicate by `order_id` across all files before showing preview (keep last occurrence)
- Show duplicate count removed in the preview summary
- Show list of all selected files with their names/sizes

### 2. Pre-Upload Deduplication Display
- After parsing all files, show: "X orders found from Y files (Z duplicates removed)"
- The preview table shows only unique orders

### 3. Metrics & Credit Timing Audit
The existing code is correct:
- **Total value**: sums `cost * qty` per order, converts to USD — correct
- **Pending**: filters by status "approved" or "non submitted" — correct
- **Overdue**: filters pending orders where `shipment_date + creditDays < now` — correct, uses `creditDays` from `usePaymentTerms` hook
- **Paid**: filters by `payment_status === 'completed'` or `status === 'paid'` — correct
- **Paid through date**: finds latest date where all prior orders are paid — correct
- **Upcoming payments**: windows at 7/30/90 days — correct
- **Dedup in bulkImportOrders**: already deduplicates by `order_id` before upsert — correct

No metrics bugs found. The `bulkImportOrders` hook already handles batch dedup properly.

## Technical Details

### File: `src/components/amazon/ImportOrdersDialog.tsx`

1. Change `file` state from `File | null` to `File[]`
2. Change file input to accept `multiple`
3. Update `handleFileSelect` to accept multiple files, parse each with XLSX, merge all rows
4. Deduplicate merged rows by `order_id` (keep last), track duplicate count
5. Update UI to show file list and dedup stats
6. No changes needed in `useAmazonOrders.ts` — dedup already exists there

### Single file change

