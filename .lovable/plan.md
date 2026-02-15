

## Add "Reprint All Printed Labels" Button with Confirmation

### What This Does
Adds a new button near the existing Print Labels controls that lets you reprint all labels for items that have already been printed. It groups labels by PO number (single PO = one batch, multiple POs = grouped batches). A double-confirmation dialog prevents accidental reprints.

### How It Works

1. **Button placement**: Added next to the existing "Print Labels" button in the Labels tab toolbar (around line 5175-5201 area).

2. **Filter logic**: The button collects all orders from the currently selected POs that have `printed_quantity > 0`. These are the items whose labels have already been printed.

3. **Confirmation dialog**: Uses an `AlertDialog` with two steps:
   - First click opens the dialog showing a summary: "You are about to reprint X labels for Y items across Z POs. Are you sure?"
   - Lists each PO with its item count and total label count
   - User must click "Yes, Reprint All" to proceed (styled with a warning color)

4. **Reprint behavior**: Uses the existing `handleReprintWithoutTracking` pattern -- generates ZPL and sends to printer WITHOUT updating `printed_quantity` in the database (since these are reprints, not new prints).

5. **PO grouping**: Labels are generated per PO group, so if items belong to different POs, they are printed in PO order for easier sorting.

### Technical Details

**File to modify:** `src/components/POTracker.tsx`

**Changes:**

1. **Add state variables** (~line 700 area):
   - `showReprintAllDialog` (boolean) -- controls the confirmation dialog
   - `isReprintingAll` (boolean) -- loading state during bulk reprint

2. **Add `handleReprintAllPrinted` function** (~line 3380 area, after `handleReprintWithoutTracking`):
   - Filters current PO's orders where `printed_quantity > 0`
   - Groups them by `po_number`
   - For each order, generates `printed_quantity` number of ZPL labels using `generateZPLFromTemplate`
   - Concatenates all ZPL codes and sends to printer via `qzConnectionManager.print()`
   - Does NOT update database (reprint only)
   - Shows success toast with count

3. **Add "Reprint All Labels" button** (~line 5200, after the existing Print Labels button):
   - Outline variant button with `RefreshCw` icon
   - Shows count of printed items in a badge
   - Disabled when no printer connected, no printed items, or currently reprinting
   - Opens the confirmation `AlertDialog` on click

4. **Add `AlertDialog` component** (~line 7200 area, with other dialogs):
   - Title: "Reprint All Printed Labels?"
   - Description: Summary of what will be reprinted (item count, label count, PO list)
   - Cancel button and "Yes, Reprint All" confirmation button
   - Confirmation button styled with warning/amber colors to emphasize caution
   - Shows loading spinner during reprint

5. **Import `AlertDialog` components** at the top of the file (AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger)

