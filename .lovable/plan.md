
## Advanced Invoice Template — Professional PDF & Dialog Redesign

The current invoice has two weak areas:
1. **The dialog UI** — plain table with no visual hierarchy, minimal branding, and no preview feel.
2. **The PDF output** — raw `jsPDF` with plain black text, no colors, no lines/shapes, no logo area, and cramped layout.

Both will be completely redesigned into a polished, professional invoice experience.

---

### What Will Change

**1. `PurchaseInvoiceGenerator.tsx` — Complete Redesign**

The dialog will be transformed into a proper invoice preview + editor:

**Header section (inside dialog)**
- Gradient banner with invoice icon and auto-generated invoice number prominently shown
- Company info section (left) + Invoice metadata (right) in a two-column layout
- Invoice number, date, due date, and status badge displayed like a real invoice

**Supplier info section**
- Card-style "Bill To" box with editable supplier name and order number
- Clean label + value layout instead of plain inputs

**Items table**
- Alternating row shading, colored header row (primary color)
- Quantity badge pill, cost in bold monospace
- Row subtotals right-aligned
- Summary totals section: Items count, Total Qty, and Grand Total in a highlighted footer card

**Notes & Actions**
- Notes textarea with a proper label and placeholder
- Two action buttons: "Export PDF" (outline) and "Save Invoice" (filled), with loading state

**2. `PurchaseInvoiceList.tsx` — List Redesign**

The list of saved invoices will become a card-based layout:
- Each invoice rendered as a mini card with invoice number, date, supplier name, item count, total amount, and status badge
- "Re-export PDF" icon button and delete button per card
- Empty state with a proper illustration-style icon and helper text

**3. PDF Export — Full Professional Redesign**

The jsPDF output will be transformed from plain black text into a designed document:

**Page structure (A4 portrait)**
- **Header band**: Dark navy/slate background (`#1e293b`) spanning full width, ~35mm tall, with "PURCHASE INVOICE" in white and invoice number in smaller white text on the right side
- **Company block (top-left under header)**: Placeholder company name "HUHA TOOLS" with tagline
- **"Bill To" block (top-right)**: Supplier name, order number, date, and due date in a light gray box
- **Divider line** before the items table
- **Table header row**: Colored background (`#3b82f6` blue), white text, columns: `#`, `ASIN`, `SKU`, `Product Title`, `PO#`, `Qty`, `Unit Cost`, `Total`
- **Table rows**: Alternating white / light gray (`#f8fafc`) rows, small font size for compact display
- **Totals section**: Right-aligned summary box with "Subtotal", "Tax (0%)", and "**Total**" in bold, with a colored accent line
- **Footer band**: Full-width dark footer with invoice number repeated and "Thank you for your business" message
- **Notes**: If present, printed just above the footer in a subtle box

**Color palette for PDF:**
- Header/footer: `#1e293b` (dark slate)
- Table header: `#2563eb` (blue)
- Accent/highlight: `#eff6ff` (light blue for alternating rows)
- Text: `#0f172a` (near black)
- Muted: `#64748b` (slate gray)

---

### Technical Details

**Files to modify: 2**

**`src/components/po/PurchaseInvoiceGenerator.tsx`**
- Restructure dialog layout with header band, two-column supplier/meta area, redesigned table, and totals card
- Replace `handleExportPDF` with the full professional jsPDF renderer using `setFillColor`, `setTextColor`, `rect`, and `line` calls
- Use a shared `buildPDFDoc(items, meta)` function called from both Generator and List

**`src/components/po/PurchaseInvoiceList.tsx`**
- Replace the plain Table with a card-grid layout for saved invoices
- Reuse the same `buildPDFDoc` logic (extracted to a shared helper or duplicated cleanly)

**Shared PDF builder logic** (inline in both files initially):
```
buildPDFDoc(items, { invoiceNumber, supplierName, supplierOrderNumber, notes, linkTitle, date })
  → returns jsPDF doc ready to save
```

---

### Dialog UI Preview (ASCII)

```text
+============================================================+
|  [FileText]  PURCHASE INVOICE          PI-20260220-XR4K   |
|  HUHA TOOLS                            Status: [Finalized] |
+============================================================+
|  BILL TO                    |   Invoice #: PI-2026-XR4K   |
|  [Supplier Name input     ] |   Date: 20 Feb 2026         |
|  [Order # input           ] |   Link: My PO Link          |
+-----------------------------+-----------------------------+
|  [Search items...]                    12 items | $4,280.00 |
+============================================================+
| #  | ASIN       | SKU      | Title          | Qty | Total  |
|----|------------|----------|----------------|-----|--------|
|  1 | B0XXXXXXX  | SKU-123  | Widget Deluxe  |  5  | $75.00 |
|  2 | B0YYYYYYY  | SKU-456  | Gadget Pro     |  3  | $90.00 |
|  ...                                                       |
+------------------------------------------------------------+
|                              SUBTOTAL:        $4,280.00    |
|                              TOTAL:           $4,280.00    |
+------------------------------------------------------------+
|  Notes: [Optional notes textarea                        ]  |
|                                                            |
|           [Export PDF (outline)]  [Save Invoice (filled)]  |
+============================================================+
```

---

### PDF Preview (described)

```text
┌──────────────────────────────────────────┐
│ [DARK NAVY BAND]                         │
│  PURCHASE INVOICE        PI-20260220-XR4K│
│  HUHA TOOLS                              │
├────────────────────────┬─────────────────┤
│ Bill To:               │ Invoice #: ...  │
│ Supplier Name          │ Date: 20 Feb    │
│ Order #: ORD-123       │ Link: My Link   │
├────────────────────────┴─────────────────┤
│ [BLUE HEADER ROW] # | ASIN | SKU | ...  │
│ [WHITE ROW      ]  1 | B0X  | S1  | ... │
│ [LIGHT BLUE ROW ]  2 | B0Y  | S2  | ... │
│ ...                                      │
├──────────────────────────────────────────┤
│                    Subtotal:   $4,280.00 │
│                    Total:      $4,280.00 │
├──────────────────────────────────────────┤
│ Notes: [notes text here]                 │
├──────────────────────────────────────────┤
│ [DARK FOOTER] PI-... | Thank you!        │
└──────────────────────────────────────────┘
```
