

## Issue: Category-Aware Serial Assignment Failing — Function Overload Conflict

### Root Cause

There are **two versions** of `get_next_serial_number` in the database:
1. `get_next_serial_number(p_user_id uuid)` — old version, no category awareness
2. `get_next_serial_number(p_user_id uuid, p_item_title text DEFAULT NULL)` — new category-aware version

When the client calls the RPC, PostgreSQL cannot resolve which overload to use, producing this error (visible in console logs):

```
Could not choose the best candidate function between:
  public.get_next_serial_number(p_user_id => uuid),
  public.get_next_serial_number(p_user_id => uuid, p_item_title => text)
```

The RPC call fails → the code catches the error and returns `''` → the calling component likely falls back to another method or retries without the title, which also fails due to the same ambiguity. The item ends up getting serial **4432** from a non-category-aware fallback path (likely the `QuantityConfirmDialog` which has its own RPC call).

For **B0G3Y6FD41** ("BURAQ Case Cover For Nothing Phone 3a Pro Shockproof Non-slip Thickening TPU Phone Case"), the category detection would match **TPU / Carbon Fiber Case** → brand **Nothing** → range 407–425. But since the function call fails entirely, the category logic never runs.

### Fix

**Database migration**: Drop the old single-parameter function overload, keeping only the two-parameter version (which already has `DEFAULT NULL` for `p_item_title`, so it handles both use cases):

```sql
DROP FUNCTION IF EXISTS public.get_next_serial_number(uuid);
```

This single SQL statement resolves the ambiguity. The remaining function `get_next_serial_number(p_user_id uuid, p_item_title text DEFAULT NULL)` will handle all calls — with or without a title parameter.

No frontend code changes needed.

