import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';
import { 
  Layers, Package, Search, Lock, Unlock, ChevronDown, ChevronUp,
  BarChart3, Shuffle, CheckSquare, Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedActionButton } from './inventory/EnhancedActionButton';
import { CATEGORY_RULES, detectCategory, detectBrand } from '@/utils/categoryDetection';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategorizedItem {
  id: string;
  asin: string;
  title: string;
  serialNumber: string;
  category: string;
  categoryColor: string;
  brand: string;
}

interface CategorySummary {
  category: string;
  color: string;
  count: number;
  bucketsNeeded: number;
  reserved: number;
  totalRange: number;
  rangeStart: number;
  rangeEnd: number;
  brands: Record<string, number>;
}

interface CategoryBucket {
  category: string;
  color: string;
  bucketIndex: number;
  totalBuckets: number;
  items: CategorizedItem[];
  key: string;
  brands: string[];
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface SerialSequencingAdvisorProps {
  inventory: AsinInventoryItem[];
  onComplete: () => void;
}

export function SerialSequencingAdvisor({ inventory, onComplete }: SerialSequencingAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bucketSize, setBucketSize] = useState(25);
  const [lockedSerials, setLockedSerials] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [growthGapPercent, setGrowthGapPercent] = useState(20);
  const [sortMode, setSortMode] = useState<'serial' | 'brand'>('brand');
  const [existingRanges, setExistingRanges] = useState<{ category: string; range_start: number; range_end: number; items_used: number }[]>([]);
  const { toast } = useToast();

  // Load existing range directory on open
  const loadRangeDirectory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from('serial_range_directory')
        .select('category, range_start, range_end, items_used')
        .eq('user_id', user.id)
        .order('range_start', { ascending: true });
      setExistingRanges(data || []);
    } catch (e) {
      console.error('Failed to load range directory:', e);
    }
  }, []);

  // Filter to active items with quantity > 0
  const activeItems = useMemo(() => 
    inventory.filter(item => item.isActive && item.quantity > 0),
    [inventory]
  );

  // Categorized items sorted by serial number
  const categorizedItems = useMemo((): CategorizedItem[] => {
    return activeItems
      .map(item => {
        const { category, color } = detectCategory(item.title);
        const brand = detectBrand(item.title);
        return {
          id: item.id,
          asin: item.asin,
          title: item.title || 'Untitled',
          serialNumber: item.serialNumber,
          category,
          categoryColor: color,
          brand,
        };
      })
      .sort((a, b) => {
        const sa = parseInt(a.serialNumber, 10) || 0;
        const sb = parseInt(b.serialNumber, 10) || 0;
        return sa - sb;
      });
  }, [activeItems]);

  // Category summary with growth gap range computation
  const categorySummary = useMemo((): CategorySummary[] => {
    const map = new Map<string, CategorySummary>();
    categorizedItems.forEach(item => {
      if (!map.has(item.category)) {
        map.set(item.category, { 
          category: item.category, color: item.categoryColor, count: 0, 
          bucketsNeeded: 0, reserved: 0, totalRange: 0, rangeStart: 0, rangeEnd: 0, brands: {} 
        });
      }
      const entry = map.get(item.category)!;
      entry.count++;
      entry.brands[item.brand] = (entry.brands[item.brand] || 0) + 1;
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);

    // Compute sequential ideal ranges with growth gap
    let cursor = 1;
    sorted.forEach(entry => {
      entry.bucketsNeeded = Math.ceil(entry.count / bucketSize);
      entry.reserved = Math.ceil(entry.count * (growthGapPercent / 100));
      entry.totalRange = entry.count + entry.reserved;
      entry.rangeStart = cursor;
      entry.rangeEnd = cursor + entry.totalRange - 1;
      cursor = entry.rangeEnd + 1;
    });

    return sorted;
  }, [categorizedItems, bucketSize, growthGapPercent]);

  // Category-based bucket grouping with sort mode
  const categoryBuckets = useMemo((): CategoryBucket[] => {
    const buckets: CategoryBucket[] = [];
    categorySummary.forEach(cat => {
      const items = categorizedItems
        .filter(i => i.category === cat.category)
        .sort((a, b) => {
          if (sortMode === 'brand') {
            const brandCmp = a.brand.localeCompare(b.brand);
            if (brandCmp !== 0) return brandCmp;
          }
          return (parseInt(a.serialNumber, 10) || 0) - (parseInt(b.serialNumber, 10) || 0);
        });
      const totalBuckets = Math.ceil(items.length / bucketSize);
      for (let i = 0; i < items.length; i += bucketSize) {
        const bucketIndex = Math.floor(i / bucketSize);
        // Determine brands in this chunk for label
        const chunk = items.slice(i, i + bucketSize);
        const chunkBrands = [...new Set(chunk.map(it => it.brand))];
        buckets.push({
          category: cat.category,
          color: cat.color,
          bucketIndex,
          totalBuckets,
          items: chunk,
          key: `${cat.category}-${bucketIndex}`,
          brands: chunkBrands,
        });
      }
    });
    return buckets;
  }, [categorySummary, categorizedItems, bucketSize, sortMode]);

  // Filtered items for search
  const filteredItemIds = useMemo(() => {
    if (!searchQuery) return null;
    const lower = searchQuery.toLowerCase();
    return new Set(
      categorizedItems
        .filter(item =>
          item.title.toLowerCase().includes(lower) ||
          item.asin.toLowerCase().includes(lower) ||
          item.serialNumber.includes(searchQuery) ||
          item.category.toLowerCase().includes(lower) ||
          item.brand.toLowerCase().includes(lower)
        )
        .map(i => i.id)
    );
  }, [categorizedItems, searchQuery]);

  // ─── Lock Helpers ─────────────────────────────────────────────────────────

  const toggleLock = (id: string) => {
    setLockedSerials(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategoryBucketLock = (bucket: CategoryBucket) => {
    const ids = bucket.items.map(i => i.id);
    const allLocked = ids.every(id => lockedSerials.has(id));
    setLockedSerials(prev => {
      const next = new Set(prev);
      ids.forEach(id => { if (allLocked) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const toggleCategoryLock = (category: string) => {
    const ids = categorizedItems.filter(i => i.category === category).map(i => i.id);
    const allLocked = ids.every(id => lockedSerials.has(id));
    setLockedSerials(prev => {
      const next = new Set(prev);
      ids.forEach(id => { if (allLocked) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const toggleAllLock = () => {
    const allIds = categorizedItems.map(i => i.id);
    const allLocked = allIds.every(id => lockedSerials.has(id));
    setLockedSerials(allLocked ? new Set() : new Set(allIds));
  };

  const toggleBucketExpand = (key: string) => {
    setExpandedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isBucketAllLocked = (bucket: CategoryBucket) =>
    bucket.items.every(i => lockedSerials.has(i.id));

  const isBucketPartiallyLocked = (bucket: CategoryBucket) => {
    const some = bucket.items.some(i => lockedSerials.has(i.id));
    const all = bucket.items.every(i => lockedSerials.has(i.id));
    return some && !all;
  };

  const isCategoryAllLocked = (category: string) =>
    categorizedItems.filter(i => i.category === category).every(i => lockedSerials.has(i.id));

  const allLocked = categorizedItems.length > 0 && categorizedItems.every(i => lockedSerials.has(i.id));

  // Group buckets by category for rendering
  const bucketsByCategory = useMemo(() => {
    const map = new Map<string, CategoryBucket[]>();
    categoryBuckets.forEach(b => {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    });
    return map;
  }, [categoryBuckets]);

  return (
    <>
      <EnhancedActionButton
        label="Serial Advisor"
        icon={Shuffle}
        variant="purple"
        tooltip="View serial number organization and lock items"
        onClick={() => { setIsOpen(true); loadRangeDirectory(); }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              Serial Number Advisor
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Items organized by category with growth gap reservations. Lock serials to exclude from auto-assignment.
            </p>
          </DialogHeader>

          <Separator />

          <div className="flex-1 min-h-0 overflow-hidden space-y-3 py-2">
            {/* Controls Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, ASIN, serial, category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-sm whitespace-nowrap">Bucket size:</Label>
                <Input
                  type="number"
                  value={bucketSize}
                  onChange={e => setBucketSize(Math.max(1, parseInt(e.target.value) || 25))}
                  className="w-16 h-8"
                  min={1}
                  max={100}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-sm whitespace-nowrap">Growth Gap:</Label>
                <Input
                  type="number"
                  value={growthGapPercent}
                  onChange={e => setGrowthGapPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-16 h-8"
                  min={0}
                  max={100}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Button
                variant={sortMode === 'brand' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode(prev => prev === 'serial' ? 'brand' : 'serial')}
                className="gap-1.5 text-xs"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {sortMode === 'brand' ? 'Brand Sort' : 'Serial Sort'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllLock}
                className="gap-1.5"
              >
                {allLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {allLocked ? 'Unlock All' : 'Lock All'}
              </Button>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <Badge variant="outline">
                {activeItems.length} items
              </Badge>
              <Badge variant="outline">
                {categorySummary.length} categories
              </Badge>
              <Badge variant="outline" className={cn(lockedSerials.size > 0 && 'bg-amber-500/10 text-amber-600 border-amber-500/30')}>
                <Lock className="w-3 h-3 mr-1" />
                {lockedSerials.size} locked
              </Badge>
            </div>

            {/* Category Summary with Growth Gap details */}
            <details className="group" open>
              <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <BarChart3 className="w-4 h-4" />
                Category Summary &amp; Growth Gap
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-2">
                <ScrollArea className="max-h-[30vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Buckets</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                        <TableHead className="text-right">Total Range</TableHead>
                        <TableHead className="text-center">Ideal Range</TableHead>
                        <TableHead>Top Brands</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySummary.map(cat => (
                        <TableRow key={cat.category}>
                          <TableCell>
                            <Badge variant="outline" className={cn('font-medium', cat.color)}>
                              {cat.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{cat.count}</TableCell>
                          <TableCell className="text-right tabular-nums">{cat.bucketsNeeded}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className="text-emerald-600 dark:text-emerald-400">+{cat.reserved}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {cat.totalRange}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                              {String(cat.rangeStart).padStart(5, '0')}–{String(cat.rangeEnd).padStart(5, '0')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(cat.brands)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 4)
                                .map(([brand, count]) => (
                                  <span key={brand} className="text-xs text-muted-foreground">
                                    {brand}({count})
                                  </span>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </details>

            {/* Existing Range Directory */}
            {existingRanges.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Package className="w-4 h-4" />
                  Active Range Directory
                  <Badge variant="outline" className="text-xs">{existingRanges.length} categories</Badge>
                  <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {existingRanges.map(r => (
                    <div key={r.category} className="text-xs p-2 bg-muted/50 rounded border border-border">
                      <div className="font-medium truncate">{r.category}</div>
                      <div className="text-muted-foreground font-mono">
                        {String(r.range_start).padStart(5, '0')}–{String(r.range_end).padStart(5, '0')}
                        <span className="ml-1">({r.items_used} used)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Category-Based Bucket View */}
            <ScrollArea className="flex-1 min-h-0 h-[40vh]">
              <div className="space-y-4 pr-2">
                {Array.from(bucketsByCategory.entries()).map(([category, buckets]) => {
                  const catSummary = categorySummary.find(c => c.category === category);
                  const catAllLocked = isCategoryAllLocked(category);
                  const catLockedCount = categorizedItems.filter(i => i.category === category && lockedSerials.has(i.id)).length;
                  const catTotalCount = categorizedItems.filter(i => i.category === category).length;

                  return (
                    <div key={category} className="border border-border rounded-lg overflow-hidden">
                      {/* Category Section Header - clickable to collapse */}
                      <div className="flex items-center bg-muted/30">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCategoryLock(category); }}
                          className="p-2.5 hover:bg-muted/50 transition-colors border-r border-border"
                          title={catAllLocked ? `Unlock all ${category}` : `Lock all ${category}`}
                        >
                          {catAllLocked
                            ? <CheckSquare className="w-4 h-4 text-amber-500" />
                            : <Square className="w-4 h-4 text-muted-foreground" />
                          }
                        </button>
                        <button
                          onClick={() => {
                            setExpandedCategories(prev => {
                              const next = new Set(prev);
                              if (next.has(category)) next.delete(category);
                              else next.add(category);
                              return next;
                            });
                          }}
                          className="flex-1 flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn('font-medium', catSummary?.color || '')}>
                              {category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {catTotalCount} items · {buckets.length} bucket{buckets.length !== 1 ? 's' : ''}
                            </span>
                            {catSummary && (
                              <span className="text-xs font-mono text-muted-foreground">
                                Gap: <span className="text-emerald-600 dark:text-emerald-400">+{catSummary.reserved}</span>
                              </span>
                            )}
                            {catLockedCount > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                <Lock className="w-2.5 h-2.5 mr-0.5" />
                                {catLockedCount}
                              </Badge>
                            )}
                          </div>
                          {expandedCategories.has(category)
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          }
                        </button>
                      </div>

                      {/* Buckets within this category (collapsible) */}
                      {expandedCategories.has(category) && (
                      <div className="space-y-1 p-1.5">
                        {buckets.map(bucket => {
                          const isExpanded = expandedBuckets.has(bucket.key);
                          const bucketAllLocked = isBucketAllLocked(bucket);
                          const bucketPartial = isBucketPartiallyLocked(bucket);
                          const lockedInBucket = bucket.items.filter(i => lockedSerials.has(i.id)).length;

                          // Serial range of actual items in this bucket
                          const firstSerial = bucket.items[0]?.serialNumber || '?';
                          const lastSerial = bucket.items[bucket.items.length - 1]?.serialNumber || '?';

                          // Filter items in this bucket by search
                          const visibleItems = filteredItemIds
                            ? bucket.items.filter(item => filteredItemIds.has(item.id))
                            : bucket.items;

                          if (filteredItemIds && visibleItems.length === 0) return null;

                          return (
                            <div key={bucket.key} className="border border-border rounded-lg overflow-hidden ml-4">
                              <div className="flex items-center">
                                {/* Bucket lock checkbox */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleCategoryBucketLock(bucket); }}
                                  className="p-2.5 hover:bg-muted/50 transition-colors border-r border-border"
                                  title={bucketAllLocked ? 'Unlock bucket' : 'Lock bucket'}
                                >
                                  {bucketAllLocked ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                                  ) : bucketPartial ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-amber-500/50" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </button>

                                {/* Bucket header */}
                                <button
                                  onClick={() => toggleBucketExpand(bucket.key)}
                                  className="flex-1 flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-primary">
                                      Bucket {bucket.bucketIndex + 1} of {bucket.totalBuckets}
                                    </span>
                                    <span className="text-xs text-muted-foreground">—</span>
                                    <span className="text-xs text-muted-foreground">{bucket.items.length} items</span>
                                    <span className="text-xs text-muted-foreground">—</span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {firstSerial}–{lastSerial}
                                    </span>
                                    {sortMode === 'brand' && bucket.brands.length > 0 && (
                                      <>
                                        <span className="text-xs text-muted-foreground">·</span>
                                        <div className="flex gap-1 flex-wrap">
                                          {bucket.brands.slice(0, 3).map(b => (
                                            <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0">
                                              {b}
                                            </Badge>
                                          ))}
                                          {bucket.brands.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground">+{bucket.brands.length - 3}</span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lockedInBucket > 0 && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                        <Lock className="w-2.5 h-2.5 mr-0.5" />
                                        {lockedInBucket}
                                      </Badge>
                                    )}
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </div>
                                </button>
                              </div>
                              
                              {isExpanded && (
                                <div className="border-t border-border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead className="w-24">Serial</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="w-20">ASIN</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {visibleItems.map(item => {
                                        const isLocked = lockedSerials.has(item.id);
                                        return (
                                          <TableRow 
                                            key={item.id}
                                            className={cn(isLocked && 'bg-amber-500/5')}
                                          >
                                            <TableCell>
                                              <button
                                                onClick={() => toggleLock(item.id)}
                                                className="p-1 hover:bg-muted rounded"
                                                title={isLocked ? 'Unlock serial' : 'Lock serial'}
                                              >
                                                {isLocked 
                                                  ? <Lock className="w-3.5 h-3.5 text-amber-500" /> 
                                                  : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                                                }
                                              </button>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm tabular-nums font-semibold">
                                              {item.serialNumber}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                              {item.brand}
                                            </TableCell>
                                            <TableCell className="max-w-[250px] truncate text-sm" title={item.title}>
                                              {item.title}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                              {item.asin}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
