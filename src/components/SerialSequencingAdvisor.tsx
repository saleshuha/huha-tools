import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
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
  Layers, ArrowRight, CheckCircle, Loader2, AlertTriangle, 
  Package, Search, Lock, Unlock, ChevronDown, ChevronUp,
  BarChart3, Shuffle, Eye, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedActionButton } from './inventory/EnhancedActionButton';

import { CATEGORY_RULES, detectCategory, detectBrand } from '@/utils/categoryDetection';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SequencedItem {
  id: string;
  asin: string;
  title: string;
  currentSerial: string;
  suggestedSerial: string;
  category: string;
  categoryColor: string;
  brand: string;
  bucket: number;
  isLocked: boolean;
  changed: boolean;
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bucketSize, setBucketSize] = useState(25);
  const [growthGapPercent, setGrowthGapPercent] = useState(20); // % extra slots per category for future items
  const [lockedSerials, setLockedSerials] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });
  const [searchPreview, setSearchPreview] = useState('');
  const [expandedBuckets, setExpandedBuckets] = useState<Set<number>>(new Set());
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

  // ─── Step 1: Analysis ───────────────────────────────────────────────────────

  const categorySummary = useMemo((): CategorySummary[] => {
    const map = new Map<string, CategorySummary>();
    
    activeItems.forEach(item => {
      const { category, color } = detectCategory(item.title);
      const brand = detectBrand(item.title);
      
      if (!map.has(category)) {
        map.set(category, { category, color, count: 0, bucketsNeeded: 0, brands: {} });
      }
      const entry = map.get(category)!;
      entry.count++;
      entry.brands[brand] = (entry.brands[brand] || 0) + 1;
    });

    // Calculate buckets needed (including growth gap)
    map.forEach(entry => {
      const totalWithGap = Math.ceil(entry.count * (1 + growthGapPercent / 100));
      entry.bucketsNeeded = Math.ceil(totalWithGap / bucketSize);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [activeItems, bucketSize]);

  const totalBuckets = useMemo(() => 
    categorySummary.reduce((sum, c) => sum + c.bucketsNeeded, 0),
    [categorySummary]
  );

  // ─── Step 2: Generate Sequenced Items ─────────────────────────────────────

  const sequencedItems = useMemo((): SequencedItem[] => {
    if (step < 2) return [];

    // Categorize and sort
    const items = activeItems.map(item => {
      const { category, color } = detectCategory(item.title);
      const brand = detectBrand(item.title);
      return { ...item, category, categoryColor: color, brand };
    });

    // Sort: Category → Brand → Title
    items.sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category);
      if (catCmp !== 0) return catCmp;
      const brandCmp = a.brand.localeCompare(b.brand);
      if (brandCmp !== 0) return brandCmp;
      return (a.title || '').localeCompare(b.title || '');
    });

    // Group by category to calculate gap sizes
    const categoryGroups = new Map<string, typeof items>();
    items.forEach(item => {
      if (!categoryGroups.has(item.category)) {
        categoryGroups.set(item.category, []);
      }
      categoryGroups.get(item.category)!.push(item);
    });

    // Assign serial numbers with growth gaps between categories
    let serialCounter = 1;
    const result: SequencedItem[] = [];
    let lastCategory = '';

    for (const item of items) {
      // When category changes, jump to next bucket boundary + gap
      if (lastCategory && item.category !== lastCategory) {
        const prevCategoryItems = categoryGroups.get(lastCategory)!;
        const gapSlots = Math.max(1, Math.ceil(prevCategoryItems.length * (growthGapPercent / 100)));
        // Round up serialCounter to include the gap (align to bucket boundary)
        const endOfPrevBlock = serialCounter + gapSlots - 1;
        serialCounter = Math.ceil(endOfPrevBlock / bucketSize) * bucketSize + 1;
      }
      lastCategory = item.category;

      const isLocked = lockedSerials.has(item.id);
      const suggestedSerial = String(serialCounter).padStart(5, '0');
      serialCounter++;

      result.push({
        id: item.id,
        asin: item.asin,
        title: item.title || 'Untitled',
        currentSerial: item.serialNumber,
        suggestedSerial: isLocked ? item.serialNumber : suggestedSerial,
        category: item.category,
        categoryColor: item.categoryColor,
        brand: item.brand,
        bucket: Math.ceil(serialCounter / bucketSize),
        isLocked,
        changed: !isLocked && item.serialNumber !== suggestedSerial,
      });
    }

    return result;
  }, [step, activeItems, lockedSerials, bucketSize, growthGapPercent]);

  // Bucket grouping for preview
  const bucketGroups = useMemo(() => {
    const groups = new Map<number, { items: SequencedItem[]; categories: Set<string> }>();
    sequencedItems.forEach(item => {
      const bucketNum = Math.ceil(parseInt(item.suggestedSerial) / bucketSize);
      if (!groups.has(bucketNum)) {
        groups.set(bucketNum, { items: [], categories: new Set() });
      }
      const g = groups.get(bucketNum)!;
      g.items.push(item);
      g.categories.add(item.category);
    });
    return groups;
  }, [sequencedItems, bucketSize]);

  // Filtered items for search
  const filteredSequencedItems = useMemo(() => {
    if (!searchPreview) return sequencedItems;
    const lower = searchPreview.toLowerCase();
    return sequencedItems.filter(item =>
      item.title.toLowerCase().includes(lower) ||
      item.asin.toLowerCase().includes(lower) ||
      item.currentSerial.includes(searchPreview) ||
      item.suggestedSerial.includes(searchPreview) ||
      item.category.toLowerCase().includes(lower) ||
      item.brand.toLowerCase().includes(lower)
    );
  }, [sequencedItems, searchPreview]);

  const changedCount = useMemo(() => 
    sequencedItems.filter(i => i.changed).length, 
    [sequencedItems]
  );

  // ─── Step 3: Apply ─────────────────────────────────────────────────────────

  const handleApply = useCallback(async () => {
    const toUpdate = sequencedItems.filter(i => i.changed);
    if (toUpdate.length === 0) {
      toast({ title: 'No changes', description: 'All serial numbers are already optimal.' });
      return;
    }

    setIsApplying(true);
    setApplyProgress({ current: 0, total: toUpdate.length });

    try {
      // Batch updates in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        
        const promises = chunk.map(item =>
          supabase
            .from('asin_inventory')
            .update({ serial_number: item.suggestedSerial } as any)
            .eq('id', item.id as any)
        );

        await Promise.all(promises);
        setApplyProgress(prev => ({ ...prev, current: Math.min(i + chunkSize, toUpdate.length) }));
      }

      // Save category range directory for future category-aware serial assignment
      try {
        const categoryRanges = new Map<string, { start: number; end: number; count: number }>();
        
        // Build ranges from all sequenced items (not just changed ones)
        sequencedItems.forEach(item => {
          const serialNum = parseInt(item.suggestedSerial, 10);
          const existing = categoryRanges.get(item.category);
          if (!existing) {
            categoryRanges.set(item.category, { start: serialNum, end: serialNum, count: 1 });
          } else {
            existing.start = Math.min(existing.start, serialNum);
            existing.end = Math.max(existing.end, serialNum);
            existing.count++;
          }
        });

        // Round range_end up to next bucket boundary for growth room
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete old ranges first, then insert new ones
          await (supabase as any)
            .from('serial_range_directory')
            .delete()
            .eq('user_id', user.id);

          const rangeInserts = Array.from(categoryRanges.entries()).map(([category, range]) => {
            // Add reserved slots: round end up to next bucket boundary
            const reservedEnd = Math.ceil(range.end / bucketSize) * bucketSize;
            return {
              user_id: user.id,
              category,
              range_start: range.start,
              range_end: reservedEnd,
              items_used: range.count,
            };
          });

          if (rangeInserts.length > 0) {
            await (supabase as any)
              .from('serial_range_directory')
              .insert(rangeInserts);
          }
          
          console.log(`📂 Saved ${rangeInserts.length} category ranges to serial_range_directory`);
        }
      } catch (rangeError) {
        console.error('Failed to save range directory (non-critical):', rangeError);
      }

      toast({
        title: 'Sequencing Complete',
        description: `Successfully reassigned ${toUpdate.length} serial numbers.`,
      });

      onComplete();
      setStep(1);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to apply sequencing:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply some serial number changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  }, [sequencedItems, onComplete, toast]);

  const toggleLock = (id: string) => {
    setLockedSerials(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBucket = (bucket: number) => {
    setExpandedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  return (
    <>
      <EnhancedActionButton
        label="Serial Advisor"
        icon={Shuffle}
        variant="purple"
        tooltip="Intelligent serial number sequencing by product category"
        onClick={() => { setIsOpen(true); setStep(1); loadRangeDirectory(); }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              Serial Number Sequencing Advisor
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Group similar products into sequential buckets of {bucketSize} for organized physical storage
            </p>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  step >= s 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={cn(
                  'text-sm font-medium hidden sm:inline',
                  step >= s ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {s === 1 ? 'Analyze' : s === 2 ? 'Preview' : 'Apply'}
                </span>
                {s < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          <Separator />

          {/* Step Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* ─── STEP 1: ANALYZE ─── */}
            {step === 1 && (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Category Analysis
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {activeItems.length} active items detected across {categorySummary.length} categories
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm whitespace-nowrap">Bucket:</Label>
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
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[45vh]">
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
                          <TableCell className="text-right font-semibold tabular-nums">
                            {cat.count}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {cat.bucketsNeeded}
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

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm">
                    <span className="font-semibold">{totalBuckets}</span> total buckets needed
                    <span className="mx-2 text-muted-foreground">•</span>
                    Serial range: <span className="font-mono font-semibold">00001</span> – <span className="font-mono font-semibold">{String(activeItems.length).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Existing Range Directory */}
                {existingRanges.length > 0 && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Active Range Directory
                      <Badge variant="outline" className="text-xs">{existingRanges.length} categories</Badge>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {existingRanges.map(r => (
                        <div key={r.category} className="text-xs p-2 bg-background rounded border">
                          <div className="font-medium truncate">{r.category}</div>
                          <div className="text-muted-foreground font-mono">
                            {String(r.range_start).padStart(5, '0')}–{String(r.range_end).padStart(5, '0')}
                            <span className="ml-1">({r.items_used} used)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── STEP 2: PREVIEW ─── */}
            {step === 2 && (
              <div className="space-y-3 py-2 h-full flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, ASIN, serial, category..."
                      value={searchPreview}
                      onChange={e => setSearchPreview(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {changedCount} changes
                  </Badge>
                  <Badge variant="outline">
                    {lockedSerials.size} locked
                  </Badge>
                </div>

                {/* Bucket-based view */}
                <ScrollArea className="flex-1 min-h-0 h-[45vh]">
                  <div className="space-y-2 pr-2">
                    {Array.from(bucketGroups.entries())
                      .sort(([a], [b]) => a - b)
                      .map(([bucketNum, group]) => {
                        const isExpanded = expandedBuckets.has(bucketNum);
                        const startSerial = String((bucketNum - 1) * bucketSize + 1).padStart(5, '0');
                        const endSerial = String(Math.min(bucketNum * bucketSize, activeItems.length)).padStart(5, '0');
                        const catLabels = Array.from(group.categories);
                        
                        // Filter items in this bucket by search
                        const visibleItems = searchPreview
                          ? group.items.filter(item => filteredSequencedItems.includes(item))
                          : group.items;

                        if (searchPreview && visibleItems.length === 0) return null;

                        return (
                          <div key={bucketNum} className="border border-border rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleBucket(bucketNum)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
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
                                <span className="text-xs text-muted-foreground">{group.items.length} items</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="border-t border-border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-10"></TableHead>
                                      <TableHead className="w-24">Current</TableHead>
                                      <TableHead className="w-8"></TableHead>
                                      <TableHead className="w-24">Suggested</TableHead>
                                      <TableHead>Category</TableHead>
                                      <TableHead>Brand</TableHead>
                                      <TableHead>Title</TableHead>
                                      <TableHead className="w-20">ASIN</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {visibleItems.map(item => (
                                      <TableRow 
                                        key={item.id}
                                        className={cn(
                                          item.changed && 'bg-primary/5',
                                          item.isLocked && 'opacity-60'
                                        )}
                                      >
                                        <TableCell>
                                          <button
                                            onClick={() => toggleLock(item.id)}
                                            className="p-1 hover:bg-muted rounded"
                                            title={item.isLocked ? 'Unlock serial' : 'Lock serial (exclude from resequencing)'}
                                          >
                                            {item.isLocked 
                                              ? <Lock className="w-3.5 h-3.5 text-amber-500" /> 
                                              : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                                            }
                                          </button>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm tabular-nums">
                                          {item.currentSerial}
                                        </TableCell>
                                        <TableCell>
                                          {item.changed && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                                        </TableCell>
                                        <TableCell className={cn(
                                          'font-mono text-sm font-semibold tabular-nums',
                                          item.changed && 'text-primary'
                                        )}>
                                          {item.suggestedSerial}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', item.categoryColor)}>
                                            {item.category}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {item.brand}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-sm" title={item.title}>
                                          {item.title}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                          {item.asin}
                                        </TableCell>
                                      </TableRow>
                                    ))}
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
            )}

            {/* ─── STEP 3: APPLY ─── */}
            {step === 3 && (
              <div className="space-y-4 py-4">
                <div className="p-6 bg-muted/50 rounded-lg border border-border text-center space-y-3">
                  <Zap className="w-10 h-10 mx-auto text-primary" />
                  <h3 className="text-lg font-semibold">Ready to Apply</h3>
                  <p className="text-muted-foreground">
                    <span className="font-bold text-foreground">{changedCount}</span> items will have their serial numbers reassigned.
                    <br />
                    <span className="font-bold text-foreground">{lockedSerials.size}</span> items are locked and will be skipped.
                  </p>
                  
                  {changedCount > 0 && (
                    <div className="flex items-center gap-2 justify-center text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>This action will overwrite existing serial numbers. Make sure to review the preview first.</span>
                    </div>
                  )}
                </div>

                {isApplying && (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Applying changes...
                      </span>
                      <span className="font-semibold tabular-nums">
                        {applyProgress.current} / {applyProgress.total}
                      </span>
                    </div>
                    <Progress
                      value={(applyProgress.current / applyProgress.total) * 100}
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)} disabled={isApplying}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isApplying}>
                Cancel
              </Button>
              {step === 1 && (
                <Button onClick={() => setStep(2)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Sequencing
                </Button>
              )}
              {step === 2 && (
                <Button onClick={() => setStep(3)} disabled={changedCount === 0}>
                  Continue to Apply ({changedCount} changes)
                </Button>
              )}
              {step === 3 && (
                <Button 
                  onClick={handleApply} 
                  disabled={isApplying || changedCount === 0}
                  className="bg-primary"
                >
                  {isApplying ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" />Apply {changedCount} Changes</>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
