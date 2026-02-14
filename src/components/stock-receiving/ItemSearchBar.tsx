import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Search, Loader2, Users, Folder, X, Clock, Zap, ScanBarcode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImagePreview } from './ImagePreview';
import { getPriorityLabel } from '@/utils/po-group-helpers';
import { cn } from '@/lib/utils';

// --- Types ---

type SearchType = 'asin' | 'sku' | 'barcode' | 'title';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent' | 'po_group' | 'not_found';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
  serial_number?: string;
  po_numbers?: string[];
  image_url?: string;
  priority?: number;
  searched_term?: string;
  quantity?: number;
  pending_quantity?: number;
  po_group?: {
    id: string;
    name: string;
    total_quantity: number;
    po_ids: string[];
    po_numbers: string[];
  };
}

interface ItemSearchBarProps {
  onItemSelect: (result: SearchResult) => void;
  disabled?: boolean;
  country?: string;
}

export interface ItemSearchBarRef {
  focusAndSelect: () => void;
}

// --- Utilities ---

const RECENT_SEARCHES_KEY = 'item-search-recent';
const MAX_RECENT = 5;

function detectSearchType(term: string): SearchType {
  const t = term.trim();
  if (/^B0[A-Z0-9]{8,}$/i.test(t)) return 'asin';
  if (/^\d{8,14}$/.test(t)) return 'barcode';
  if (/^[A-Z0-9-]{3,20}$/i.test(t) && !t.includes(' ')) return 'sku';
  return 'title';
}

function getSearchTypeLabel(type: SearchType): { label: string; icon: string } {
  switch (type) {
    case 'asin': return { label: 'ASIN', icon: '🔗' };
    case 'barcode': return { label: 'Barcode', icon: '📱' };
    case 'sku': return { label: 'SKU', icon: '🏷️' };
    case 'title': return { label: 'Title', icon: '📝' };
  }
}

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function addRecentSearch(term: string) {
  const recent = getRecentSearches().filter(s => s !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function highlightMatch(text: string, term: string): React.ReactNode {
  if (!term || !text) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{text.slice(idx, idx + term.length)}</span>
      {text.slice(idx + term.length)}
    </>
  );
}

function getPriorityColor(priority?: number): string {
  switch (priority) {
    case 1: return 'bg-red-500/15 text-red-700 border-red-300';
    case 2: return 'bg-orange-500/15 text-orange-700 border-orange-300';
    case 3: return 'bg-yellow-500/15 text-yellow-700 border-yellow-300';
    case 4: return 'bg-blue-500/15 text-blue-700 border-blue-300';
    case 5: return 'bg-muted text-muted-foreground border-border';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

// --- Component ---

export const ItemSearchBar = forwardRef<ItemSearchBarRef, ItemSearchBarProps>(
  ({ onItemSelect, disabled, country }, ref) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isScanMode, setIsScanMode] = useState(false);
    const [detectedType, setDetectedType] = useState<SearchType>('title');
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastInputTime = useRef(0);
    const scanTimer = useRef<ReturnType<typeof setTimeout>>();

    useImperativeHandle(ref, () => ({
      focusAndSelect: () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    }));

    // Detect barcode scanner (very fast sequential input)
    const handleInputChange = useCallback((value: string) => {
      const now = Date.now();
      const timeSinceLastInput = now - lastInputTime.current;
      lastInputTime.current = now;

      if (timeSinceLastInput < 50 && value.length > 5) {
        setIsScanMode(true);
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => setIsScanMode(false), 2000);
      }

      setSearchTerm(value);
      setSelectedIndex(-1);

      if (value.trim().length >= 2) {
        setDetectedType(detectSearchType(value.trim()));
      }
    }, []);

    // Show recent searches when focused with empty input
    const handleFocus = useCallback(() => {
      if (!searchTerm.trim()) {
        const recent = getRecentSearches();
        if (recent.length > 0) {
          setResults(recent.map(term => ({
            type: 'recent' as const,
            searched_term: term,
            context: 'Recent search'
          })));
          setShowDropdown(true);
        }
      } else if (results.length > 0) {
        setShowDropdown(true);
      }
    }, [searchTerm, results.length]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!showDropdown) return;

      const selectableResults = results.filter(r => r.type !== 'not_found');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, selectableResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const result = selectableResults[selectedIndex];
        if (result) handleSelect(result);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        setSearchTerm('');
        setResults([]);
      }
    }, [showDropdown, results, selectedIndex]);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex >= 0 && dropdownRef.current) {
        const items = dropdownRef.current.querySelectorAll('[data-result-item]');
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    // Search effect with dynamic debounce
    useEffect(() => {
      if (searchTerm.length < 3) {
        if (!searchTerm.trim()) {
          // Show recent searches
          const recent = getRecentSearches();
          if (recent.length > 0 && document.activeElement === inputRef.current) {
            setResults(recent.map(term => ({
              type: 'recent' as const,
              searched_term: term,
              context: 'Recent search'
            })));
            setShowDropdown(true);
          } else {
            setResults([]);
            setShowDropdown(false);
          }
        } else {
          setResults([]);
          setShowDropdown(false);
        }
        return;
      }

      const type = detectSearchType(searchTerm.trim());
      const debounceMs = type === 'title' ? 300 : 150;

      const timer = setTimeout(() => searchItems(searchTerm), debounceMs);
      return () => clearTimeout(timer);
    }, [searchTerm, country]);

    const searchItems = async (term: string) => {
      setSearching(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to search items');
          setSearching(false);
          return;
        }

        const normalized = term.trim().toUpperCase();
        const keywords = normalized.split(/\s+/).filter(k => k.length > 0);

        const buildTitleCondition = (kws: string[]) => {
          if (kws.length === 1) return `title.ilike.%${kws[0]}%`;
          return `and(${kws.map(kw => `title.ilike.%${kw}%`).join(',')})`;
        };

        const titleCondition = buildTitleCondition(keywords);

        // Search PO orders with increased limit
        const { data: poData, error: poError } = await supabase
          .from('po_orders')
          .select('id, asin, sku_code, model_number, title, po_number, priority, quantity, printed_quantity')
          .or(`asin.ilike.%${normalized}%,sku_code.ilike.%${normalized}%,model_number.ilike.%${normalized}%,${titleCondition}`)
          .in('status', ['pending', 'placed'])
          .limit(50);

        if (poError) console.error('PO query error:', poError.message);

        // Filter out fully printed items
        const filteredPoData = poData?.filter(po => {
          const printed = po.printed_quantity || 0;
          return (po.quantity - printed) > 0;
        }) || [];

        // Get group memberships
        let poGroupMap = new Map<string, string>();
        if (filteredPoData.length > 0) {
          const poIds = filteredPoData.map(po => po.id);
          const { data: groupMembers } = await supabase
            .from('po_group_members')
            .select('po_id, group_id')
            .in('po_id', poIds);

          groupMembers?.forEach(m => poGroupMap.set(m.po_id, m.group_id));
        }

        // Search inventory
        let invQuery = supabase
          .from('asin_inventory')
          .select('asin, sku, title, country, serial_number, quantity, status')
          .or(`asin.ilike.%${normalized}%,sku.ilike.%${normalized}%,${titleCondition}`);

        if (country) invQuery = invQuery.eq('country', country);
        const { data: invData } = await invQuery.limit(10);

        // Fetch images
        const allAsins = [...new Set([
          ...(filteredPoData?.map(i => i.asin).filter(Boolean) || []),
          ...(invData?.map(i => i.asin).filter(Boolean) || [])
        ])];

        const { data: productImages } = allAsins.length > 0
          ? await supabase.from('product_images').select('asin, image_url').in('asin', allAsins).order('created_at', { ascending: false })
          : { data: null };

        const imageMap = new Map(productImages?.map(img => [img.asin, img.image_url]) || []);

        const searchResults: SearchResult[] = [];

        // Process PO results
        if (filteredPoData.length > 0) {
          const groupIds = [...new Set(Array.from(poGroupMap.values()))];
          let groupMap = new Map();

          if (groupIds.length > 0) {
            const { data: groupData } = await supabase
              .from('po_groups')
              .select('id, group_name, priority')
              .in('id', groupIds);
            groupMap = new Map(groupData?.map(g => [g.id, g]) || []);
          }

          // Group by item + group membership
          const grouped = filteredPoData.reduce((acc, item) => {
            const itemKey = item.asin || item.sku_code || item.model_number || 'unknown';
            const groupId = poGroupMap.get(item.id);
            const key = `${itemKey}_${groupId || 'ungrouped'}`;

            if (!acc[key]) {
              acc[key] = {
                ...item,
                count: 0,
                po_numbers: [] as string[],
                max_priority: item.priority || 0,
                group_id: groupId,
                total_quantity: 0,
                total_pending: 0,
              };
            }
            acc[key].count++;
            acc[key].total_quantity += item.quantity || 0;
            acc[key].total_pending += (item.quantity || 0) - (item.printed_quantity || 0);
            if (item.po_number && !acc[key].po_numbers.includes(item.po_number)) {
              acc[key].po_numbers.push(item.po_number);
            }
            if (item.priority && item.priority > acc[key].max_priority) {
              acc[key].max_priority = item.priority;
            }
            return acc;
          }, {} as Record<string, any>);

          Object.values(grouped).forEach((item: any) => {
            const groupInfo = item.group_id ? groupMap.get(item.group_id) : null;

            searchResults.push({
              type: groupInfo ? 'po_group' : 'po',
              asin: item.asin,
              sku_code: item.sku_code,
              model_number: item.model_number,
              title: item.title,
              context: groupInfo
                ? `${item.count} PO${item.count > 1 ? 's' : ''} in ${groupInfo.group_name}`
                : `${item.count} ungrouped PO${item.count > 1 ? 's' : ''}`,
              po_count: item.count,
              po_numbers: item.po_numbers,
              priority: groupInfo ? groupInfo.priority : item.max_priority,
              quantity: item.total_quantity,
              pending_quantity: item.total_pending,
              po_group: groupInfo ? {
                id: item.group_id,
                name: groupInfo.group_name,
                total_quantity: item.count,
                po_ids: [],
                po_numbers: item.po_numbers
              } : undefined,
              image_url: item.asin ? imageMap.get(item.asin) : undefined
            });
          });
        }

        // Process inventory results
        invData?.forEach(item => {
          const exists = searchResults.find(r => r.asin === item.asin || r.sku_code === item.sku);
          if (!exists) {
            searchResults.push({
              type: 'inventory',
              asin: item.asin,
              sku_code: item.sku,
              title: item.title,
              serial_number: item.serial_number,
              context: item.serial_number
                ? `In inventory (SN: ${item.serial_number})`
                : `In inventory • ${item.status || 'active'}`,
              image_url: item.asin ? imageMap.get(item.asin) : undefined
            });
          }
        });

        if (searchResults.length === 0) {
          searchResults.push({
            type: 'not_found',
            searched_term: normalized,
            asin: normalized,
            context: 'Item not found in PO orders or inventory'
          });
        }

        // Sort by priority
        searchResults.sort((a, b) => (a.priority || 999) - (b.priority || 999));

        setResults(searchResults);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    };

    const handleSelect = (result: SearchResult) => {
      if (result.type === 'not_found') return;

      if (result.type === 'recent') {
        setSearchTerm(result.searched_term || '');
        return;
      }

      addRecentSearch(searchTerm.trim());
      setShowDropdown(false);
      setSearchTerm('');
      setSelectedIndex(-1);
      onItemSelect(result);
    };

    const clearSearch = () => {
      setSearchTerm('');
      setResults([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    };

    // Close dropdown on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
            inputRef.current && !inputRef.current.contains(e.target as Node)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectableResults = results.filter(r => r.type !== 'not_found');
    const resultCount = selectableResults.length;
    const hasRecentOnly = results.length > 0 && results.every(r => r.type === 'recent');

    const typeInfo = searchTerm.trim().length >= 2 ? getSearchTypeLabel(detectedType) : null;

    return (
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
            isScanMode ? "text-green-500" : "text-muted-foreground"
          )} />
          <Input
            ref={inputRef}
            placeholder="Search ASIN, SKU, Model, Barcode, or Title..."
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              "pl-10 pr-24 h-12 text-base bg-background/80 border-primary/20 focus:border-primary transition-all",
              isScanMode && "ring-2 ring-green-500/40 border-green-500/50"
            )}
          />

          {/* Right side indicators */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isScanMode && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-300 animate-pulse">
                <ScanBarcode className="w-3 h-3 mr-0.5" />
                Scan
              </Badge>
            )}
            {typeInfo && searchTerm.trim().length >= 2 && !searching && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-muted text-muted-foreground">
                {typeInfo.icon} {typeInfo.label}
              </Badge>
            )}
            {searching && (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            )}
            {!searching && resultCount > 0 && showDropdown && !hasRecentOnly && (
              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20" variant="outline">
                {resultCount}
              </Badge>
            )}
            {searchTerm && (
              <button onClick={clearSearch} className="p-0.5 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Results */}
        {showDropdown && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {/* Recent searches header */}
            {hasRecentOnly && (
              <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/50 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
            )}

            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                // Recent search item
                if (result.type === 'recent') {
                  return (
                    <button
                      key={`recent-${index}`}
                      data-result-item
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors border-b border-border/30 last:border-0",
                        selectedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">{result.searched_term}</span>
                    </button>
                  );
                }

                // Not found
                if (result.type === 'not_found') {
                  return (
                    <div key="not-found" className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center shrink-0">
                          <Search className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] text-yellow-600 bg-yellow-50 border-yellow-200">
                              Not Found
                            </Badge>
                            <span className="font-medium text-sm text-foreground">"{result.searched_term}"</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Not found in pending POs or inventory. Add to inventory first.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Normal result
                const identifier = result.asin || result.sku_code || result.model_number;
                const isPO = result.type === 'po' || result.type === 'po_group';
                const isGrouped = result.type === 'po_group';
                const selectableIdx = selectableResults.indexOf(result);

                return (
                  <button
                    key={`${result.type}-${identifier}-${index}`}
                    data-result-item
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors border-b border-border/30 last:border-0",
                      selectableIdx === selectedIndex ? "bg-accent" : "hover:bg-accent/50",
                      isGrouped && "border-l-2 border-l-primary/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <ImagePreview
                        imageUrl={result.image_url}
                        alt={result.title || identifier || 'Product'}
                        size="md"
                        showFullOnClick={false}
                      />

                      <div className="flex-1 min-w-0">
                        {/* PO Numbers - scrollable */}
                        {result.po_numbers && result.po_numbers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5 max-h-12 overflow-y-auto">
                            {result.po_numbers.map((poNum, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                              >
                                {poNum}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Badge + Identifier */}
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <Badge
                            variant={isPO ? 'default' : 'secondary'}
                            className={cn("text-[10px] h-5 shrink-0", isGrouped && "bg-primary")}
                          >
                            {isGrouped ? '📦 Group' : isPO ? '📦 PO' : '📥 Inv'}
                          </Badge>
                          <span className="font-medium text-sm text-foreground truncate">
                            {highlightMatch(identifier || '', searchTerm.trim())}
                          </span>
                          {result.sku_code && result.sku_code !== identifier && (
                            <span className="text-[11px] text-muted-foreground">• {result.sku_code}</span>
                          )}
                        </div>

                        {/* Title */}
                        {result.title && (
                          <div className="text-xs text-muted-foreground truncate">
                            {highlightMatch(result.title, searchTerm.trim())}
                          </div>
                        )}

                        {/* Context */}
                        <div className="text-[11px] text-primary/80 mt-0.5">{result.context}</div>
                      </div>

                      {/* Right column: Priority + Pending */}
                      <div className="flex flex-col gap-1.5 items-end ml-auto shrink-0">
                        {/* Pending quantity */}
                        {isPO && result.pending_quantity !== undefined && result.quantity !== undefined && (
                          <div className="text-right">
                            <div className="text-xs font-bold text-foreground">
                              {result.pending_quantity}
                              <span className="text-muted-foreground font-normal">/{result.quantity}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">remaining</div>
                          </div>
                        )}

                        {/* Priority badge */}
                        {result.priority && result.priority <= 5 && (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] h-5 border", getPriorityColor(result.priority))}
                          >
                            {getPriorityLabel(result.priority)}
                          </Badge>
                        )}

                        {/* Group badge */}
                        {isGrouped && result.po_group && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            <Folder className="w-3 h-3 mr-0.5" />
                            {result.po_group.name}
                          </Badge>
                        )}

                        {!isGrouped && isPO && (
                          <span className="text-[10px] text-muted-foreground">Ungrouped</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Keyboard hint */}
            {selectableResults.length > 0 && !hasRecentOnly && (
              <div className="px-3 py-1.5 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/30">
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">↑↓</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">↵</kbd> select</span>
                <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">esc</kbd> close</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ItemSearchBar.displayName = 'ItemSearchBar';
