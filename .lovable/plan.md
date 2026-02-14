

## Advanced Item Search Bar Upgrade

### Current Issues
- Basic single input with 300ms debounce, no visual feedback during typing
- No barcode/scanner mode distinction
- Limited result display (max 20 PO results, 5 inventory)
- No search history or recent searches
- No keyboard navigation in dropdown
- No quantity/pending info shown in results
- No clear visual hierarchy between grouped vs ungrouped items

### Planned Improvements

#### 1. Enhanced Search Input UX
- Add search mode indicator chips (ASIN, SKU, Title, Barcode) that auto-detect based on input pattern
- Show result count badge while typing
- Add clear button (X) with keyboard shortcut (Escape)
- Add a subtle scanning animation when input looks like a barcode scan (fast input)

#### 2. Smarter Search Logic
- Auto-detect input type: if starts with "B0" treat as ASIN, if all numeric treat as barcode/UPC, otherwise fuzzy title search
- Reduce debounce to 150ms for short codes (ASIN/SKU), keep 300ms for title searches
- Show pending quantity vs total quantity in results so operators know what still needs processing
- Increase PO result limit from 20 to 50 for better coverage

#### 3. Keyboard Navigation
- Arrow Up/Down to navigate results
- Enter to select highlighted result
- Escape to close dropdown and clear

#### 4. Improved Result Cards
- Show remaining/pending quantity prominently (e.g., "3 of 10 remaining")
- Color-coded priority indicators (red for P1, orange for P2, etc.)
- Better visual separation between PO group results vs ungrouped vs inventory
- Show all PO numbers (scrollable) instead of limiting to 3

#### 5. Recent Searches Section
- Show last 5 searched terms when input is focused but empty
- Stored in localStorage for persistence across sessions

### Technical Details

**Files to modify:**
- `src/components/stock-receiving/ItemSearchBar.tsx` - Main component rewrite with all improvements above

**Key implementation details:**
- Add `selectedIndex` state for keyboard navigation
- Add `onKeyDown` handler on input for arrow keys + Enter + Escape
- Add search type detection function: `detectSearchType(term) => 'asin' | 'sku' | 'barcode' | 'title'`
- Adjust debounce dynamically based on detected type
- Add localStorage-based recent searches (key: `item-search-recent`)
- Show pending quantity by calculating `quantity - printed_quantity` from existing query data
- Add `highlightMatch` utility to bold matching text in results
- Increase dropdown max-height from `max-h-80` to `max-h-96` for more visible results

