

# Redesign: Unified PO Groups & Priority

## Problem
The current implementation splits grouping and priority into two separate tabs with duplicated PO lists, redundant state, and a bloated 863-line component. This causes confusion and slow performance.

## Solution: Single Unified View

Replace the two-tab layout with a single streamlined view that shows groups as collapsible cards, each with inline priority controls and PO management.

### Layout (top to bottom)

```text
+-----------------------------------------------+
| PO Groups & Priority           [+ New Group]   |
| Manage groups and set priority                  |
+-----------------------------------------------+
| [Search groups or POs...]                       |
+-----------------------------------------------+
| > P1 | Urgent Orders    | 5 POs, 120 items     |
|   [Edit] [Delete]                               |
|   (collapsed - click to expand PO list)         |
+-----------------------------------------------+
| > P2 | Weekly Batch      | 12 POs, 340 items    |
|   [Edit] [Delete]                               |
+-----------------------------------------------+
| > P3 | Standard Orders   | 8 POs, 200 items     |
|   [Edit] [Delete]                               |
+-----------------------------------------------+
| Tip: Ungrouped POs auto-receive priority.       |
+-----------------------------------------------+
```

### What Changes

1. **Remove the tabs** -- no more "Priority" vs "Groups" split
2. **Remove the separate PO list loading** -- no more fetching all group members individually. Groups already have `member_count`, `total_quantity`, and `po_numbers` from the RPC. Only load PO details on-demand when a group is expanded.
3. **Remove `POGroupManager.tsx`** -- it's unused in the page and duplicates functionality
4. **Inline group actions** -- Edit, Delete, and "Add POs" all accessible per group card
5. **Keep "Create Group" dialog** -- triggered from the header button, with PO selection inside the dialog (not in the main list)

### Technical Details

**File: `src/components/stock-receiving/PriorityPOList.tsx`** (rewrite, ~400 lines down from 863)
- Remove `pos` state and `loadPOs` function entirely -- no bulk PO fetching on mount
- Remove the `Tabs` component and both `TabsContent` sections
- Remove `rowVirtualizer` (not needed for group-level list)
- Groups render from `poGroups` (already fetched via RPC in `usePOGroups`)
- Each group is a collapsible card sorted by priority
- Expanding a group calls `getPOsInGroup()` on-demand and caches results in local state
- Search filters groups by name or `po_numbers` array (no PO fetching needed)
- "New Group" button opens a dialog where user types group name, description, priority, and selects POs (fetched only inside the dialog)

**File: `src/components/stock-receiving/POGroupManager.tsx`**
- Delete this file (unused duplicate)

**File: `src/pages/ReceiveStock.tsx`**
- Remove `POGroupManager` import (already not rendered, just imported)

**File: `src/hooks/usePOGroups.ts`**
- No changes needed, already optimized

### Performance Gains
- Page load: no more fetching thousands of `po_group_members` on mount
- Group data comes from a single RPC call (already cached for 2 minutes)
- PO details only fetched when user expands a specific group
- Eliminates the `updateUngroupedPriorities` fire-and-forget call on every mount

