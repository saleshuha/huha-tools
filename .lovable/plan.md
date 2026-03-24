

# Fix: Order Print Query Timeout

## Root Cause

The `get_printable_orders` database function times out because:
- The JOIN condition uses `upper(trim(pei.identifier)) = upper(trim(o.sku))` which prevents any index from being used
- For 156 orders × 32,229 print_eligible_items = **5 million row comparisons** per query
- EXPLAIN ANALYZE confirms: **10.5 seconds** execution time, sequential scan on `print_eligible_items` every loop

## Fix

### 1. Create a functional index on `print_eligible_items`
Add an index on `upper(trim(identifier))` so the JOIN can use it efficiently:

```sql
CREATE INDEX idx_pei_upper_trim_identifier 
ON print_eligible_items (user_id, upper(trim(identifier))) 
WHERE is_active = true;
```

### 2. Create a matching index on `order_imports`
```sql
CREATE INDEX idx_oi_user_created_upper_sku 
ON order_imports (user_id, created_at, upper(trim(sku)));
```

### 3. Rewrite the RPC function to use a subquery instead of LEFT JOIN
Replace the expensive LEFT JOIN with an `EXISTS` subquery, which allows early termination once a match is found (instead of scanning all 32K rows):

```sql
SELECT ...,
  EXISTS (
    SELECT 1 FROM print_eligible_items pei
    WHERE pei.user_id = o.user_id
      AND upper(trim(pei.identifier)) = upper(trim(o.sku))
      AND pei.is_active = true
      AND (lower(pei.type) = 'sku' OR pei.type IS NULL)
  ) AS printable
FROM order_imports o
WHERE ...
```

This should reduce the query from ~10s to <100ms.

## Files Modified
- **Database migration**: Create functional indexes + rewrite `get_printable_orders` function

