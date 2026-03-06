

# Plan: Category-Aware Serial Assignment System (Future-Forward, No Relabeling)

## What This Solves

Your existing 2,066 items keep their current serial numbers (00001–02066) untouched. Going forward, the system becomes **category-aware** — when you auto-assign a serial (either from the inventory page or stock receiving), it will place the new item into the correct category's serial range instead of just filling the next global gap.

## How It Works

### 1. New Database Table: `serial_range_directory`

Stores which serial number ranges belong to which category. Built automatically when you run the Serial Advisor.

| Column | Purpose |
|--------|---------|
| `user_id` | Owner |
| `category` | e.g., "Screen Protector", "TPU / Carbon Fiber Case" |
| `range_start` | First serial in this category's block (integer) |
| `range_end` | Last serial (includes reserved gap slots) |
| `items_used` | How many slots are currently occupied |

### 2. Update Serial Advisor to Save Range Directory

When the advisor applies sequencing (Step 3), it also saves the category-to-range mapping. Each category gets extra reserved slots (rounded up to next bucket of 25) for future growth. This is a one-time setup — after applying, the directory exists and auto-assign uses it.

### 3. Category-Aware `get_next_serial_number` RPC

Updated RPC accepts an optional `p_item_title` parameter:
- If title is provided → detect category → find that category's range → assign next unused serial **within that range**
- If title is NULL or no range directory exists → fall back to current global gap-filling logic (backward compatible)
- If a category's range is full → extend at the end (append new range block)

### 4. Update Auto-Assign Buttons

**In Stock Inventory button** (`AsinInventory.tsx`): Already has the item's title available. Pass it to `getNextAvailableSerial(title)`.

**Stock Receiving button** (`QuantityConfirmDialog.tsx`): Already has `item.title` from the scanned/selected product. Pass it to the RPC.

Both buttons work exactly the same as before from the user's perspective — click and get a serial — but now the serial lands in the right category range.

## Files to Change

| File | Change |
|------|--------|
| **New SQL migration** | Create `serial_range_directory` table with RLS; update `get_next_serial_number` RPC to accept optional `p_item_title` and do category-aware lookup |
| **`src/components/SerialSequencingAdvisor.tsx`** | After applying sequencing, save category ranges to `serial_range_directory`; show a "Range Directory" summary in Step 1 if ranges already exist |
| **`src/hooks/useAsinInventory.ts`** | Update `getNextAvailableSerial` to accept optional `title` param and pass it to RPC |
| **`src/components/AsinInventory.tsx`** | Pass item title when calling auto-assign serial |
| **`src/components/stock-receiving/QuantityConfirmDialog.tsx`** | Pass item title to the RPC call |
| **`src/components/SerialNumberEditor.tsx`** | Accept optional title prop for category-aware auto-assign |
| **`src/components/MultiSerialNumberEditor.tsx`** | Same — accept optional title prop |

## Key Design Decisions

- **Backward compatible**: The RPC without a title works exactly as before (global gap-fill)
- **Category detection reuses** the existing `detectCategory()` engine from the Serial Advisor — same rules, same keywords, moved to a shared utility
- **No relabeling**: Existing serials stay. The range directory is built around current assignments
- **Overflow handling**: When a category range fills up, the system allocates a new block at the end of the global counter and updates the directory

