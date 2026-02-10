

## Rebuild DF Order Processing - Clean 4-Step Workflow

### Overview
Completely rebuild the DF Order Processing page into a clean, guided 4-step wizard flow. Each step is visually distinct with a stepper navigation, and the user progresses naturally through: Upload -> Sunsky Source Match -> Inventory Match -> Process & Deduct.

### Current Problems
- Everything is crammed into one screen with too many components
- No clear separation between "Sunsky source matching" and "inventory matching" - they're mixed together
- The pipeline visual is decorative but doesn't actually guide workflow
- No "Source Status" column showing if an item comes from Sunsky catalog
- Processing is buried in a collapsible card

---

### New Architecture: 4-Step Wizard

```text
Step 1: UPLOAD          Step 2: SOURCE MATCH       Step 3: INVENTORY        Step 4: PROCESS
+-----------------+     +--------------------+     +------------------+     +------------------+
| Upload CSV/XLSX |     | Match SKUs against |     | Match all items  |     | Select & process |
| Show file info  | --> | Sunsky catalog     | --> | against your     | --> | orders, deduct   |
| Preview orders  |     | Mark source status |     | ASIN/SKU invent. |     | stock one-by-one |
+-----------------+     +--------------------+     +------------------+     | or in bulk       |
                                                                           +------------------+
```

### Step-by-Step Details

**Step 1 - Upload Orders**
- Drag-and-drop or click-to-upload area (clean, centered)
- Accepts CSV/XLSX files
- Shows upload progress bar
- After upload: displays summary card (total orders, date range, file name)
- Table preview of first 10 rows
- "Continue to Source Matching" button

**Step 2 - Sunsky Source Matching**
- Automatically checks each order's SKU against the `sunsky_skus` table
- Shows progress bar during matching
- Results table with new **Source Status** column:
  - "Sunsky" badge (green) - SKU found in sunsky_skus catalog
  - "Other" badge (gray) - SKU not found in catalog
- Summary: X of Y items sourced from Sunsky
- Sunsky-matched items show supplier cost from catalog
- "Continue to Inventory Check" button

**Step 3 - Inventory Matching**
- Cross-references ALL orders (not just Sunsky) against `asin_inventory` and `sku_inventory`
- New **Inventory Status** column:
  - "In Stock" (green) - available qty >= order qty
  - "Low Stock" (amber) - available qty > 0 but < order qty  
  - "Out of Stock" (red) - qty = 0 or no match
  - "Not Tracked" (gray) - item not in inventory system
- Shows available units next to required quantity
- Filter tabs: All | In Stock | Low Stock | Out of Stock
- "Continue to Processing" button

**Step 4 - Process & Deduct**
- Only shows items that have inventory matches (In Stock or Low Stock)
- Checkboxes for selection
- **Process One-by-One**: Click a "Process" button on each row
- **Bulk Process**: Select multiple and click "Process Selected"
- Before processing, shows confirmation with stock impact:
  - Current stock -> After deduction
- On process: deducts from inventory, records in `processed_orders` table
- Real-time progress bar for bulk operations
- Processing history log at bottom

### New Component Structure

| Component | Purpose |
|-----------|---------|
| `DFProcessingWizard.tsx` | Main wizard container with step navigation |
| `DFStepIndicator.tsx` | Clean horizontal stepper showing 4 steps |
| `DFUploadStep.tsx` | Step 1 - file upload with drag-drop and preview |
| `DFSourceMatchStep.tsx` | Step 2 - Sunsky catalog matching with source status |
| `DFInventoryMatchStep.tsx` | Step 3 - inventory cross-reference with availability |
| `DFProcessStep.tsx` | Step 4 - order processing with stock deduction |
| `DFOrderRow.tsx` | Reusable table row component used across steps |
| `DFProcessConfirmDialog.tsx` | Confirmation dialog before stock deduction |

### Files to Modify/Create

| File | Action |
|------|--------|
| `src/pages/OrderProcessing.tsx` | Simplify to render new wizard |
| `src/components/df-processing/DFProcessingWizard.tsx` | **New** - Main wizard with state management |
| `src/components/df-processing/DFStepIndicator.tsx` | **New** - Step progress indicator |
| `src/components/df-processing/DFUploadStep.tsx` | **New** - Upload step |
| `src/components/df-processing/DFSourceMatchStep.tsx` | **New** - Sunsky source matching |
| `src/components/df-processing/DFInventoryMatchStep.tsx` | **New** - Inventory matching |
| `src/components/df-processing/DFProcessStep.tsx` | **New** - Processing with deduction |
| `src/components/df-processing/DFProcessConfirmDialog.tsx` | **New** - Confirmation dialog |

### Data Flow

1. Upload parses file -> stores orders in state + `order_imports` table
2. Source match checks each SKU against `sunsky_skus` table -> adds `sourceStatus` field
3. Inventory match checks ASIN/SKU against `asin_inventory` + `sku_inventory` -> adds `inventoryStatus`, `availableQty` fields
4. Processing deducts via existing `updateAsinQuantity`/`updateSkuQuantity` hooks -> records in `processed_orders`

### UI Design Principles
- Clean white cards with subtle borders
- Step indicator at the top with numbered circles and connecting lines
- Each step is a full-width card with clear title, description, and action button
- Tables are compact with good use of badges for status
- Only show the active step's content (not all steps at once)
- Back/Next navigation between steps
- Summary counts visible in the step indicator

### Database Changes
- **None required** - all existing tables (`order_imports`, `processed_orders`, `sunsky_skus`, `asin_inventory`, `sku_inventory`) already have the needed columns
- The `order_imports` table already has `has_inventory_match`, `is_processed` columns that will be utilized properly

### Existing Code Reuse
- Reuse `useAsinInventory` and `useSkuInventory` hooks for inventory data
- Reuse `useProductImages` for product thumbnails
- Reuse `useSKUManager` for Sunsky SKU lookups
- Reuse existing file parsing logic (Papa.parse for CSV, XLSX for Excel)
- Keep the `processed_orders` insert logic from current `processSelectedItems`

