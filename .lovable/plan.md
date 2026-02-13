

## Remove Vendor Info & Supplier Details + Mobile Search UX

### Changes

**1. Remove VendorInfoForm and SupplierDetailsForm**

Remove the "Your Information" section (VendorInfoForm at line 593) and the "Supplier Details" collapsible from each item card (lines 837-844). Also remove related imports, state (`supplierDetails`), and references in `handleSaveGroup` (supplier detail fields). The `getVendorInfo` helper and vendor info references in save/bulk functions will also be removed.

**2. Mobile Search UX: Keep search bar at top, results centered above keyboard**

- Add CSS to ensure the search bar stays pinned at the top (already sticky, keep as-is)
- When a search input is focused on mobile, add bottom padding to the list container so results stay visible above the virtual keyboard
- Use a `searchFocused` state to detect when either search input is focused, and when active, add extra bottom padding (e.g. `pb-[50vh]`) to push content up so matched results appear in the visible area above the keyboard
- Scroll the first matching result into view when search results change while focused on mobile

### Technical Details

**File: `src/pages/PurchaseLink.tsx`**

1. Remove imports: `VendorInfoForm`, `getStoredVendorInfo`, `SupplierDetailsForm`, `SupplierDetails`
2. Remove state: `supplierDetails` (line 52)
3. Remove `getVendorInfo` function (lines 141-144)
4. Remove all `vendorInfo` and `groupSupplierDetails` references in `handleSaveGroup`, `handleMarkNotAvailable`, `handleUndoNotAvailable`, `handleBulkMarkPurchased`, `handleBulkMarkNotAvailable`
5. Remove `<VendorInfoForm>` render (line 593)
6. Remove `<SupplierDetailsForm>` render block (lines 837-844)
7. Remove supplier details from `exportData` mapping (lines 511-523)
8. Add `searchFocused` state, attach `onFocus`/`onBlur` handlers to both search inputs
9. When `searchFocused` is true on mobile, add `pb-[50vh]` to the virtualizer container so the visible results sit higher on screen (above the keyboard)
10. Auto-scroll the list to top when debounced search values change while focused

