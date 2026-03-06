

## Issue: Dialog closes but still triggers stock receiving

### Root Cause

The `QuantityConfirmDialog` has an `onKeyDown={handleKeyDown}` handler on the entire `DialogContent` (line 315) that calls `handleSubmit(true)` on any Enter keypress. When a user interacts with the dialog (e.g., clicking the X button or pressing Escape), if focus is anywhere inside the dialog and an Enter key event bubbles up, it triggers an unintended submission.

Additionally, the `onOpenChange` prop passes `onClose` directly. Radix Dialog fires `onOpenChange(false)` when clicking the overlay or pressing Escape — this correctly closes without submitting. However, the Enter key issue means the dialog can submit before the user intends to.

The core problem: **The Enter key handler on `DialogContent` auto-submits without any explicit user confirmation action** (clicking "Receive" or "Receive & Print"). Any accidental Enter keypress triggers receiving.

### Fix

**File: `src/components/stock-receiving/QuantityConfirmDialog.tsx`**

1. **Restrict the Enter key handler** to only fire when the focused element is the quantity input field, not any arbitrary element in the dialog (like the close button, PO badge links, switches, etc.):

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !processing) {
    // Only auto-submit when focused on the quantity input
    const target = e.target as HTMLElement;
    if (target.id === 'quantity' || target.id === 'serial') {
      e.preventDefault();
      handleSubmit(true);
    }
  }
};
```

2. **Prevent Escape key from accidentally triggering submit** — ensure the `onKeyDown` doesn't interfere with dialog close behavior by stopping propagation only for handled keys.

This is a single-file change that prevents unintended receiving when closing the dialog.

