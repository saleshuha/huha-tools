

## Add Search Type Selector and Auto-Chip System to Noon Orders Tab

### Overview

Enhance the search bar in the Noon Orders tab with two features:
1. **Search Type Selector** -- A dropdown before the search input to select what field to search (Default/All, ASIN, SKU, Title, Order Nr, Partner SKU, Country)
2. **Auto-Chip Creation** -- When a user types and pauses for 1.5 seconds (or presses Enter), the search term automatically becomes a removable chip/badge, allowing multiple search terms to be active simultaneously

### How It Works

- A dropdown selector sits to the left of the search input showing the current search type (default: "All")
- Available search types: All, Order Nr, SKU, Partner SKU, Title, Country
- When the user types a term and either:
  - Pauses typing for 1.5 seconds, OR
  - Presses Enter
  - The term is converted into a colored chip/badge showing `[Type]: [Value]`
- Multiple chips can be active at once (e.g., "SKU: ABC123" + "Title: Phone Case")
- Each chip has an X button to remove it
- A "Clear all" button appears when more than one chip is active
- The filtering logic applies all active chips as AND conditions

### UI Design

```text
+---------------------------------------------------------------+
| [All v] [  Search...                    ] | Columns | Actions |
+---------------------------------------------------------------+
| Active Chips: [All: phone x] [SKU: ABC x]   Clear all        |
+---------------------------------------------------------------+
```

### Technical Details

**File to modify:** `src/components/noon-processing/NoonOrdersTab.tsx`

**State changes:**
- Replace `searchTerm: string` with `searchChips: Array<{ type: string; value: string }>` 
- Add `searchType: string` (current dropdown selection, default "All")
- Add `inputValue: string` (current text in input)
- Add a `useRef` timer for auto-chip creation (1.5s debounce)

**Search type options:**
| Label | Field(s) searched |
|-------|------------------|
| All (Default) | order_nr, purchase_item_nr, sku, partner_sku, title, order_country_code |
| Order Nr | order_nr |
| SKU | sku |
| Partner SKU | partner_sku |
| Title | title |
| Item Nr | purchase_item_nr |
| Country | order_country_code |

**Filter logic update:**
- Each chip filters independently based on its type
- All chips are combined with AND logic
- When type is "All", the chip searches across all fields (current behavior)

**Auto-chip timer:**
- `useEffect` watches `inputValue` changes
- Sets a 1.5-second timeout; if no new keystrokes, auto-creates chip
- Timer resets on each keystroke
- Enter key immediately creates chip and clears input
- Empty/whitespace input is ignored
- Duplicate chips (same type + value) are prevented

**Chip UI:**
- Uses the existing `Badge` component with `variant="secondary"`
- Format: `Type: Value` with an X button
- Styled consistently with the existing filter chips pattern in the codebase (see `FilterChips.tsx`)

