import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
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
  bucket: number;
}

interface CategorySummary {
  category: string;
  color: string;
  count: number;
  bucketsNeeded: number;
  brands: Record<string, number>;
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
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set());
  const [growthGapPercent, setGrowthGapPercent] = useState(20);
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

  // Categorized items sorted by serial number, grouped into buckets
  const categorizedItems = useMemo((): CategorizedItem[] => {
    return activeItems
      .map(item => {
        const { category, color } = detectCategory(item.title);
        const brand = detectBrand(item.title);
        const serialNum = parseInt(item.serialNumber, 10) || 0;
        return {
          id: item.id,
          asin: item.asin,
          title: item.title || 'Untitled',
          serialNumber: item.serialNumber,
          category,
          categoryColor: color,
          brand,
          bucket: Math.ceil(serialNum / bucketSize) || 1,
        };
      })
      .sort((a, b) => {
        const sa = parseInt(a.serialNumber, 10) || 0;
        const sb = parseInt(b.serialNumber, 10) || 0;
        return sa - sb;
      });
  }, [activeItems, bucketSize]);

  // Category summary
  const categorySummary = useMemo((): CategorySummary[] => {
    const map = new Map<string, CategorySummary>();
    categorizedItems.forEach(item => {
      if (!map.has(item.category)) {
        map.set(item.category, { category: item.category, color: item.categoryColor, count: 0, bucketsNeeded: 0, brands: {} });
      }
      const entry = map.get(item.category)!;
      entry.count++;
      entry.brands[item.brand] = (entry.brands[item.brand] || 0) + 1;
    });
    map.forEach(entry => {
      entry.bucketsNeeded = Math.ceil(entry.count / bucketSize);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [categorizedItems, bucketSize]);

  // Bucket grouping
  const bucketGroups = useMemo(() => {
    const groups = new Map<number, { items: CategorizedItem[]; categories: Set<string> }>();
    categorizedItems.forEach(item => {
      if (!groups.has(item.bucket)) {
        groups.set(item.bucket, { items: [], categories: new Set() });
      }
      const g = groups.get(item.bucket)!;
      g.items.push(item);
      g.categories.add(item.category);
    });
    return groups;
  }, [categorizedItems]);

  // Filtered items for search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return categorizedItems;
    const lower = searchQuery.toLowerCase();
    return categorizedItems.filter(item =>
      item.title.toLowerCase().includes(lower) ||
      item.asin.toLowerCase().includes(lower) ||
      item.serialNumber.includes(searchQuery) ||
      item.category.toLowerCase().includes(lower) ||
      item.brand.toLowerCase().includes(lower)
    );
  }, [categorizedItems, searchQuery]);

  const filteredItemIds = useMemo(() => new Set(filteredItems.map(i => i.id)), [filteredItems]);

  // ─── Lock Helpers ─────────────────────────────────────────────────────────

  const toggleLock = (id: string) => {
    setLockedSerials(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBucketLock = (bucketNum: number) => {
    const group = bucketGroups.get(bucketNum);
    if (!group) return;
    const bucketIds = group.items.map(i => i.id);
    const allLocked = bucketIds.every(id => lockedSerials.has(id));
    setLockedSerials(prev => {
      const next = new Set(prev);
      bucketIds.forEach(id => {
        if (allLocked) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const toggleAllLock = () => {
    const allIds = categorizedItems.map(i => i.id);
    const allLocked = allIds.every(id => lockedSerials.has(id));
    setLockedSerials(allLocked ? new Set() : new Set(allIds));
  };

  const toggleBucketExpand = (bucket: number) => {
    setExpandedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  const isBucketAllLocked = (bucketNum: number) => {
    const group = bucketGroups.get(bucketNum);
    if (!group) return false;
    return group.items.every(i => lockedSerials.has(i.id));
  };

  const isBucketPartiallyLocked = (bucketNum: number) => {
    const group = bucketGroups.get(bucketNum);
    if (!group) return false;
    const some = group.items.some(i => lockedSerials.has(i.id));
    const all = group.items.every(i => lockedSerials.has(i.id));
    return some && !all;
  };

  const allLocked = categorizedItems.length > 0 && categorizedItems.every(i => lockedSerials.has(i.id));

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
              View item categories in buckets of {bucketSize} and lock serials to exclude from auto-assignment
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

            {/* Category Summary (collapsible) */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <BarChart3 className="w-4 h-4" />
                Category Summary
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-2">
                <ScrollArea className="max-h-[25vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Buckets</TableHead>
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

            {/* Bucket View */}
            <ScrollArea className="flex-1 min-h-0 h-[40vh]">
              <div className="space-y-2 pr-2">
                {Array.from(bucketGroups.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([bucketNum, group]) => {
                    const isExpanded = expandedBuckets.has(bucketNum);
                    const startSerial = String((bucketNum - 1) * bucketSize + 1).padStart(5, '0');
                    const endSerial = String(bucketNum * bucketSize).padStart(5, '0');
                    const catLabels = Array.from(group.categories);
                    const bucketAllLocked = isBucketAllLocked(bucketNum);
                    const bucketPartial = isBucketPartiallyLocked(bucketNum);
                    const lockedInBucket = group.items.filter(i => lockedSerials.has(i.id)).length;

                    // Filter items in this bucket by search
                    const visibleItems = searchQuery
                      ? group.items.filter(item => filteredItemIds.has(item.id))
                      : group.items;

                    if (searchQuery && visibleItems.length === 0) return null;

                    return (
                      <div key={bucketNum} className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center">
                          {/* Bucket lock checkbox */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleBucketLock(bucketNum); }}
                            className="p-3 hover:bg-muted/50 transition-colors border-r border-border"
                            title={bucketAllLocked ? 'Unlock entire bucket' : 'Lock entire bucket'}
                          >
                            {bucketAllLocked ? (
                              <CheckSquare className="w-4 h-4 text-amber-500" />
                            ) : bucketPartial ? (
                              <CheckSquare className="w-4 h-4 text-amber-500/50" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>

                          {/* Bucket header */}
                          <button
                            onClick={() => toggleBucketExpand(bucketNum)}
                            className="flex-1 flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-bold text-primary">
                                Bucket {bucketNum}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {startSerial}–{endSerial}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {catLabels.slice(0, 3).map(cat => {
                                  const rule = CATEGORY_RULES.find(r => r.category === cat);
                                  return (
                                    <Badge key={cat} variant="outline" className={cn('text-[10px] px-1.5 py-0', rule?.color || '')}>
                                      {cat}
                                    </Badge>
                                  );
                                })}
                                {catLabels.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{catLabels.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {lockedInBucket > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                                  {lockedInBucket}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{group.items.length} items</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                                  <TableHead>Category</TableHead>
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
                                      <TableCell>
                                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', item.categoryColor)}>
                                          {item.category}
                                        </Badge>
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
