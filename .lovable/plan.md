

## Fix: Show Only Assigned Items in Purchase Log

**Problem**: The Purchase Log tab currently shows ALL items from daily order purchase links, including unassigned ones. It should only show items where a supplier has been assigned.

**Solution**: Re-add the `supplier_name` filter when building log entries from the `market_purchase_links` JSONB data.

### Technical Change

**File: `src/components/market-purchases/PurchaseLogTab.tsx`** (line 57)

Wrap the `entries.push(...)` call inside an `if (item.supplier_name)` check, so only items with an assigned supplier appear in this log. This restores the filter that was removed in the previous edit while keeping the data source as `market_purchase_links` (daily orders only, no PO items).

