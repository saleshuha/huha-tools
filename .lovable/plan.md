
## Fix Blank Purchase Link Page on Mobile + UI Enhancement

### Problem
The public purchase link page (`/purchase/:token`) shows a blank page when accessed without authentication (e.g., on mobile by a vendor). The error is:

> "useProductBarcodes must be used within a BarcodeProvider"

The `BarcodeProvider` only wraps the authenticated layout in `App.tsx` (line 218), but the unauthenticated route for `/purchase/:token` (line 202) has no `BarcodeProvider`.

### Fix

**File: `src/App.tsx`** (lines 198-204)

Wrap the unauthenticated `PurchaseLink` route with `<BarcodeProvider>` so the `useProductBarcodes` hook works:

```text
<BrowserRouter>
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/purchase/:token" element={
      <BarcodeProvider>
        <PurchaseLink />
      </BarcodeProvider>
    } />
    <Route path="*" element={<Navigate to="/auth" replace />} />
  </Routes>
</BrowserRouter>
```

Add the `BarcodeProvider` import (already imported at the top of the file for the authenticated layout).

### UI Enhancement for PurchaseLinkManagement.tsx

Redesign the admin purchase link management cards with a more polished, professional look:

**File: `src/components/po/PurchaseLinkManagement.tsx`**

1. **Card redesign**: Add a left color accent strip (green for active, gray for inactive), cleaner spacing, and a more structured layout with clear visual sections.

2. **Header section**: Title with status badge inline, description below, and action buttons grouped cleanly on the right.

3. **Stats row**: Display views, updates, POs count, and dates in a horizontal stat bar with subtle background cards and icons.

4. **Progress section**: Keep the segmented progress bar but add percentage labels for each segment and use a cleaner rounded design.

5. **PO badges section**: Use a collapsible section with a "Show all" toggle instead of the "+N more" approach.

6. **Action buttons**: Consolidate into a cleaner layout - primary "Open" button prominently displayed, "Copy" as icon button, and dropdown for secondary actions.

### UI Enhancement for Public PurchaseLink Page

**File: `src/pages/PurchaseLink.tsx`**

1. **Mobile-first card layout**: Restructure item cards so on mobile the image, info, and actions stack vertically with proper spacing.

2. **Sticky filter bar**: Make the filter/search section sticky on scroll for easier mobile navigation.

3. **Improved item cards**: Add subtle left border color coding (green = purchased, yellow = partial, red = N/A, gray = pending), cleaner typography hierarchy.

4. **Better touch targets**: Ensure all buttons and inputs meet 44px minimum touch target size on mobile.

### Technical Details

Files to modify:
- `src/App.tsx` -- Wrap unauthenticated purchase link route with BarcodeProvider (critical fix)
- `src/components/po/PurchaseLinkManagement.tsx` -- Redesign admin link cards with better visual hierarchy
- `src/pages/PurchaseLink.tsx` -- Improve mobile layout and card design
- `src/components/purchase-link/PurchaseSummaryHeader.tsx` -- Minor mobile responsiveness improvements
