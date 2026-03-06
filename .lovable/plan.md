

## Root Cause: Pagination Duplicates Due to Non-Unique Sort Column

The PO orders query in `usePOOrdersQuery.ts` fetches data in pages of 1000, sorted by `created_at DESC`. However, many PO items share the exact same `created_at` timestamp (e.g., all 350 items in PO `2WRLKB2R` have timestamp `2026-02-26 21:00:49.299388`). 

PostgreSQL does not guarantee a stable row order for ties, so between page 1 (`range(0, 999)`) and page 2 (`range(1000, 1999)`), the same row can appear on both pages while another row appears on neither. This results in:
- **413 items** loaded for PO `2WRLKB2R` instead of the actual 350 (63 duplicates)
- Some items like B0DSS8QRHB potentially **missing entirely** from the loaded dataset
- Inconsistent counts across the UI (`350 items` from DB metrics vs `19/413` from frontend count)

### Fix

**File: `src/hooks/usePOOrdersQuery.ts`**

Add a secondary sort column (`id`) to guarantee deterministic ordering across pages:

```typescript
.order('created_at', { ascending: false })
.order('id', { ascending: true })   // ← tiebreaker for stable pagination
```

Additionally, add client-side deduplication as a safety net after all pages are fetched:

```typescript
// Deduplicate by id in case of any remaining edge cases
const seen = new Set();
allOrders = allOrders.filter(order => {
  if (seen.has(order.id)) return false;
  seen.add(order.id);
  return true;
});
```

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/usePOOrdersQuery.ts` | Add `.order('id')` tiebreaker + client-side dedup |

This single fix will resolve the missing item issue and the count mismatches throughout the Labels tab.

