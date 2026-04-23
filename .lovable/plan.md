

# Add Print Quantity Input to Label Designer

## What Changes

Add a quantity input control next to the Print button in the Label Designer toolbar so users can specify how many copies of the current label to print in one click.

## UI

In `AdvancedLabelWorkspace.tsx` toolbar, just before the Print button:

- A small number input (width ~64px) showing the print quantity
- Default value: `1`, min: `1`, max: `999`
- Shown only when QZ is connected and a printer is selected (same gating as Print)
- Tooltip: "Number of label copies to print"
- Persisted to `localStorage` as `labelDesignerPrintQty` (same pattern as `printDarkness`)

The Print button label updates to reflect quantity when > 1, e.g. `Print ×5`.

## Behavior

- New state: `printQty` (number), initialized from localStorage (fallback `1`)
- `handlePrint` already builds `printSettings` with a `copies` field that is currently hardcoded to `1`. Change it to use `printQty`.
- After successful print, toast becomes: `"Sent N label(s) to printer"`
- Quantity persists to localStorage on change (same pattern as darkness)

The existing ZPL pipeline (`PrintService.generateZPL`) already honors `copies` via the `^PQ` command, so no service-layer changes are required.

## Technical Details

### File: `src/components/label/AdvancedLabelWorkspace.tsx`

1. Add `printQty` state (lines ~74) with localStorage hydration
2. Update `handlePrint` (line 300) — replace `copies: 1` with `copies: printQty`, persist qty, and update success toast message
3. Add a compact `<Input type="number">` (with small +/- handled via native input) between the Darkness popover (line 1063) and the Print button (line 1064). Wrap with a `Label` for accessibility. Constrain width with `w-16 h-9`.
4. Update Print button text to show `Print` or `Print ×{printQty}` when qty > 1

### Single file change, no service or context changes needed

