

## Redesign Purchase Link Generation with Advanced Item Selection

The current "Generate Link" dialog has a simple toggle between "All items" and "Filtered items" which doesn't give enough control. We'll redesign it to match the Print Preview pattern -- with in-dialog search, per-item checkboxes, and select/deselect controls.

---

### What Changes

**Replace the simple toggle** in `GeneratePurchaseLinkDialog.tsx` with a full item selection interface:

1. **Search bar inside the dialog** -- search by ASIN, SKU, title, or PO number to filter the item list
2. **Checkbox per item** -- individually select/deselect items to include in the link
3. **Select All / Deselect All buttons** -- bulk toggle for visible (search-filtered) items
4. **Item count summary** -- always shows "X of Y items selected"
5. **Scrollable item list** with product images, ASIN, SKU, title, PO number, and quantity
6. **All items pre-selected by default** -- user removes what they don't need (same as Print Preview pattern)

### Data Flow Change

Currently the dialog receives `filteredOrders` (pre-filtered from the parent). The new approach:
- Pass ALL orders from the selected POs to the dialog (not just filtered ones)
- Let the user search and select within the dialog itself
- Only the checked items' IDs get sent as `poOrderIds` to the edge function

### Technical Details

**Files modified: 1**

- **`src/components/po/GeneratePurchaseLinkDialog.tsx`** -- Full rewrite of the dialog body:
  - New props: receive all orders from selected POs (not pre-filtered)
  - Add `selectedItemIds` state (Set of IDs, initialized with all items)
  - Add `dialogSearchQuery` state for in-dialog search
  - Search filters the visible list; checkboxes control what gets included
  - "Select All Visible" / "Deselect All" buttons
  - Item rows show: checkbox, ASIN/SKU badge, truncated title, PO number, quantity
  - Generate button shows count: "Generate Link (X items)"
  - Always sends `poOrderIds` array (the selected item IDs) to the edge function

- **`src/components/POTracker.tsx`** -- Update the dialog invocation:
  - Pass all orders from selected POs (not just `filteredOrders` intersection)
  - Remove the `totalOrderCount` prop (no longer needed -- selection happens in dialog)

### UI Layout (inside dialog)

```text
+--------------------------------------------------+
| Generate Purchase Link                           |
| Create a shareable link for purchasing team      |
+--------------------------------------------------+
| [Search ASIN, SKU, title, PO...]        42 of 96 |
| [Select All Visible] [Deselect All]              |
+--------------------------------------------------+
| [x] B0XXXXX | SKU-123 | Widget Title... | PO-7MX | x5 |
| [x] B0YYYYY | SKU-456 | Gadget Name... | PO-7MX | x3 |
| [ ] B0ZZZZZ | SKU-789 | Thing Here...  | PO-5O1 | x2 |
| ... (scrollable, max-h-64)                        |
+--------------------------------------------------+
| Link Title: [________________________]           |
| Description: [________________________]          |
| Expiration: [30 days v]                          |
|                                                  |
| [  Generate Link (42 items)  ]                   |
+--------------------------------------------------+
```

This matches the Print Preview UX pattern -- users get full control over exactly which items go into the purchase link.
