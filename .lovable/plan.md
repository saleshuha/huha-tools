# Add Printer Selection + Persist Settings — Inventory Label Printing Card

## What Changes

The "LABEL PRINTING" card on the Inventory page currently exposes only Template + Darkness + Print. A QZ printer is auto‑selected behind the scenes but the user can't see or change it from this card. We will:

1. Add a **Printer** dropdown to the card (between Template and Darkness).
2. Persist the chosen **printer**, **template**, and **darkness** so they're restored automatically next time the user visits the page.

## UI

In `src/components/inventory/LabelPrintingCard.tsx` change the controls grid from `md:grid-cols-3` to `md:grid-cols-4` and add a new column:

- Label: "Printer" (with a small printer icon)
- `Select` listing `availablePrinters`, bound to `selectedPrinter`
- Disabled when `qzConnected` is false, with placeholder "QZ not connected" / "Select printer..."
- Shows a small green dot next to the currently active printer name

The Print button stays in the last column. When no printer is selected, it is disabled with tooltip "Select a printer".

## Persistence Behavior

- **Printer**: saved to `localStorage` key `qz-default-printer` whenever the user changes it (key already used on load — we just write back on change).
- **Template**: already saved to `savedLabelTemplate` on change — keep as is, and ensure restore on mount actually applies it after templates load (verify `useEffect` after `loadTemplates`).
- **Darkness**: already saved via `useLabelPrintSettings` hook (`labelPrintSettings` localStorage key) — keep as is.

A small "Saved" badge appears under the controls row for ~1.5s after any setting changes, so the user gets feedback that the choice will persist.

## Technical Details

### `src/components/inventory/LabelPrintingCard.tsx`
- Add props: `availablePrinters: string[]`, `selectedPrinter: string`, `onPrinterChange: (p: string) => void`.
- Render new Printer `Select` column. Update `canPrint` to also require `selectedPrinter`.
- Change grid to `md:grid-cols-4`.

### `src/components/AsinInventory.tsx`
- Add handler `handlePrinterSelection(printer: string)` that calls `setSelectedPrinter(printer)` and `localStorage.setItem('qz-default-printer', printer)`.
- Pass `availablePrinters`, `selectedPrinter`, and `onPrinterChange={handlePrinterSelection}` into `<LabelPrintingCard />` (around line 1665).
- Add a `useEffect` that, after `availableTemplates` loads, reads `localStorage.getItem('savedLabelTemplate')` and calls `setSelectedTemplate` if the id still exists in the list (defensive — handles deleted templates).
- No changes to print logic itself; `handleBulkPrint` already uses `selectedPrinter` and `getPrintSettings()` which reads persisted darkness.

### Files touched
- `src/components/inventory/LabelPrintingCard.tsx` (add Printer column + props)
- `src/components/AsinInventory.tsx` (wire props, persist printer, restore template)

No DB, no edge function, no schema changes.
