import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';
import {
  Layers, Save, ChevronDown, ChevronRight, Loader2, Shuffle, BarChart3, Plus,
  ArrowUp, ArrowDown, RefreshCw, Database, Calculator, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedActionButton } from './inventory/EnhancedActionButton';
import { detectCategory, detectBrand } from '@/utils/categoryDetection';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrandBlock {
  brand: string;
  count: number;
  rangeStart: number;
  rangeEnd: number;
  gap: number;
}

interface CategoryPlan {
  category: string;
  color: string;
  totalItems: number;
  brands: BrandBlock[];
  categoryGap: number;
  rangeStart: number;
  rangeEnd: number;
  hasCustomGap: boolean;
}

interface SavedRow {
  id: string;
  category: string;
  brand: string | null;
  range_start: number;
  range_end: number;
  items_used: number;
  updated_at: string;
}

type Mode = 'saved' | 'compute';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function categoryColorFor(category: string, fallbackInventory: AsinInventoryItem[]): string {
  // Try to derive the same color the planner assigns by sampling an item
  for (const item of fallbackInventory) {
    const { category: c, color } = detectCategory(item.title);
    if (c === category) return color;
  }
  return 'text-muted-foreground border-border';
}

// Group saved rows into CategoryPlan[] preserving DB order.
function savedRowsToPlan(rows: SavedRow[], inventory: AsinInventoryItem[]): CategoryPlan[] {
  const order: string[] = [];
  const grouped = new Map<string, SavedRow[]>();
  rows.forEach(r => {
    if (!grouped.has(r.category)) {
      grouped.set(r.category, []);
      order.push(r.category);
    }
    grouped.get(r.category)!.push(r);
  });

  const result: CategoryPlan[] = [];
  order.forEach(category => {
    const catRows = grouped.get(category)!.sort((a, b) => a.range_start - b.range_start);
    const brands: BrandBlock[] = catRows.map(r => {
      // Saved range_end already includes the brand gap; reconstruct usable end + gap.
      const usableEnd = r.range_start + Math.max(0, r.items_used) - 1;
      const safeUsableEnd = Math.min(r.range_end, Math.max(usableEnd, r.range_start));
      const gap = Math.max(0, r.range_end - safeUsableEnd);
      return {
        brand: r.brand || 'All',
        count: Math.max(0, r.items_used),
        rangeStart: r.range_start,
        rangeEnd: safeUsableEnd,
        gap,
      };
    });
    const totalItems = brands.reduce((s, b) => s + b.count, 0);
    const lastBrand = catRows[catRows.length - 1];
    const catEnd = lastBrand.range_end;
    const lastUsable = brands[brands.length - 1].rangeEnd;
    const categoryGap = Math.max(0, catEnd - lastUsable);

    result.push({
      category,
      color: categoryColorFor(category, inventory),
      totalItems,
      brands,
      categoryGap,
      rangeStart: catRows[0].range_start,
      rangeEnd: catEnd,
      hasCustomGap: false,
    });
  });

  return result;
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface SerialSequencingAdvisorProps {
  inventory: AsinInventoryItem[];
  onComplete: () => void;
}

export function SerialSequencingAdvisor({ inventory, onComplete }: SerialSequencingAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('saved');
  const [categoryGapPercent, setCategoryGapPercent] = useState(20);
  const [brandGapPercent, setBrandGapPercent] = useState(10);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [customCategoryGaps, setCustomCategoryGaps] = useState<Record<string, number>>({});
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Saved-plan state
  const [savedRows, setSavedRows] = useState<SavedRow[]>([]);
  const [savedUpdatedAt, setSavedUpdatedAt] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Tick to keep "x ago" fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const iv = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(iv);
  }, [isOpen]);

  const { toast } = useToast();
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  // ─── Active items / computed plan ──────────────────────────────────────────

  const activeItems = useMemo(() =>
    inventory.filter(item => item.isActive && item.quantity > 0),
    [inventory]
  );

  const categoryBrandCounts = useMemo(() => {
    const map = new Map<string, { color: string; brands: Map<string, number> }>();
    activeItems.forEach(item => {
      const { category, color } = detectCategory(item.title);
      const brand = detectBrand(item.title);
      if (!map.has(category)) map.set(category, { color, brands: new Map() });
      const entry = map.get(category)!;
      entry.brands.set(brand, (entry.brands.get(brand) || 0) + 1);
    });
    return map;
  }, [activeItems]);

  const computedPlan = useMemo((): CategoryPlan[] => {
    const categories: { category: string; color: string; totalItems: number; brands: { brand: string; count: number }[] }[] = [];

    categoryBrandCounts.forEach((val, category) => {
      const brands = Array.from(val.brands.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => a.brand.localeCompare(b.brand));
      const totalItems = brands.reduce((s, b) => s + b.count, 0);
      categories.push({ category, color: val.color, totalItems, brands });
    });

    if (categoryOrder) {
      const orderMap = new Map(categoryOrder.map((c, i) => [c, i]));
      categories.sort((a, b) => {
        const oa = orderMap.get(a.category) ?? 9999;
        const ob = orderMap.get(b.category) ?? 9999;
        return oa - ob;
      });
    } else {
      categories.sort((a, b) => b.totalItems - a.totalItems);
    }

    let cursor = 1;
    const result: CategoryPlan[] = [];

    categories.forEach(cat => {
      const catStart = cursor;
      const brandBlocks: BrandBlock[] = [];

      cat.brands.forEach(b => {
        const gap = Math.ceil(b.count * brandGapPercent / 100);
        brandBlocks.push({
          brand: b.brand,
          count: b.count,
          rangeStart: cursor,
          rangeEnd: cursor + b.count - 1,
          gap,
        });
        cursor += b.count + gap;
      });

      const hasCustomGap = cat.category in customCategoryGaps;
      const categoryGap = hasCustomGap
        ? customCategoryGaps[cat.category]
        : Math.ceil(cat.totalItems * categoryGapPercent / 100);
      const catEnd = cursor + categoryGap - 1;

      result.push({
        category: cat.category,
        color: cat.color,
        totalItems: cat.totalItems,
        brands: brandBlocks,
        categoryGap,
        rangeStart: catStart,
        rangeEnd: catEnd,
        hasCustomGap,
      });

      cursor = catEnd + 1;
    });

    return result;
  }, [categoryBrandCounts, categoryGapPercent, brandGapPercent, customCategoryGaps, categoryOrder]);

  const savedPlan = useMemo(() => savedRowsToPlan(savedRows, inventory), [savedRows, inventory]);

  const activePlan = mode === 'saved' && savedRows.length > 0 ? savedPlan : computedPlan;
  const totalSerials = activePlan.length > 0 ? activePlan[activePlan.length - 1].rangeEnd : 0;

  // Diff badges (compute mode): brands whose computed count differs from saved count.
  const savedBrandKey = (cat: string, brand: string) => `${cat}::${brand}`;
  const savedBrandMap = useMemo(() => {
    const m = new Map<string, SavedRow>();
    savedRows.forEach(r => m.set(savedBrandKey(r.category, r.brand || 'All'), r));
    return m;
  }, [savedRows]);

  const driftCount = useMemo(() => {
    if (mode !== 'compute' || savedRows.length === 0) return 0;
    let n = 0;
    computedPlan.forEach(cat => {
      cat.brands.forEach(b => {
        const saved = savedBrandMap.get(savedBrandKey(cat.category, b.brand));
        if (!saved || saved.items_used !== b.count) n += 1;
      });
    });
    return n;
  }, [mode, savedRows.length, computedPlan, savedBrandMap]);

  // ─── Loaders + Realtime ────────────────────────────────────────────────────

  const loadSavedPlan = useCallback(async (silent = false) => {
    if (!silent) setLoadingSaved(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from('serial_range_directory')
        .select('id, category, brand, range_start, range_end, items_used, updated_at')
        .eq('user_id', user.id)
        .order('range_start', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as SavedRow[];
      setSavedRows(rows);
      setSavedUpdatedAt(rows.length ? rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), rows[0].updated_at) : null);
      setPendingRefresh(false);
      setDirty(false);
    } catch (e: any) {
      if (!silent) toast({ title: 'Failed to load saved plan', description: e.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoadingSaved(false);
    }
  }, [toast]);

  // Open: load + decide initial mode
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingSaved(false); return; }
        const { data, error } = await (supabase as any)
          .from('serial_range_directory')
          .select('id, category, brand, range_start, range_end, items_used, updated_at')
          .eq('user_id', user.id)
          .order('range_start', { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        const rows = (data || []) as SavedRow[];
        setSavedRows(rows);
        setSavedUpdatedAt(rows.length ? rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), rows[0].updated_at) : null);
        setMode(rows.length > 0 ? 'saved' : 'compute');
        setDirty(false);
        setPendingRefresh(false);
      } catch (e: any) {
        if (!cancelled) toast({ title: 'Failed to load saved plan', description: e.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, toast]);

  // Realtime subscription while open
  useEffect(() => {
    if (!isOpen) return;
    let channel: any;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      channel = supabase
        .channel(`serial-range-directory-${user.id}`)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'serial_range_directory', filter: `user_id=eq.${user.id}` },
          () => {
            if (dirtyRef.current) {
              setPendingRefresh(true);
            } else {
              loadSavedPlan(true);
            }
          }
        )
        .subscribe();
    })();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isOpen, loadSavedPlan]);

  // ─── Editing helpers ────────────────────────────────────────────────────────

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  };

  const setCustomGap = (category: string, value: number) => {
    setCustomCategoryGaps(prev => ({ ...prev, [category]: Math.max(0, value) }));
    if (mode === 'saved') setDirty(true);
  };

  const removeCustomGap = (category: string) => {
    setCustomCategoryGaps(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
    if (mode === 'saved') setDirty(true);
  };

  const expandAll = () => setExpandedCategories(new Set(activePlan.map(p => p.category)));
  const collapseAll = () => setExpandedCategories(new Set());

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const currentOrder = categoryOrder ?? activePlan.map(p => p.category);
    const newOrder = [...currentOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCategoryOrder(newOrder);
    setDirty(true);
  };

  const resetOrder = () => { setCategoryOrder(null); setDirty(true); };

  // Edit a saved brand row (range_start / items_used). When in saved mode we update savedRows
  // directly so the recomputed savedPlan reflects the change immediately.
  const editSavedBrand = (category: string, brand: string, patch: Partial<Pick<SavedRow, 'range_start' | 'range_end' | 'items_used'>>) => {
    setSavedRows(prev => prev.map(r => {
      if (r.category !== category || (r.brand || 'All') !== brand) return r;
      return { ...r, ...patch };
    }));
    setDirty(true);
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const savePlan = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await (supabase as any)
        .from('serial_range_directory').delete().eq('user_id', user.id);
      if (deleteError) throw deleteError;

      const rows = activePlan.flatMap(cat =>
        cat.brands.map(b => ({
          user_id: user.id,
          category: cat.category,
          brand: b.brand,
          range_start: b.rangeStart,
          range_end: b.rangeEnd + b.gap,
          items_used: b.count,
        }))
      );

      if (rows.length > 0) {
        const { error } = await (supabase as any).from('serial_range_directory').insert(rows);
        if (error) throw error;
      }

      toast({ title: 'Plan saved', description: `${rows.length} brand ranges saved to directory.` });
      // Reload so the saved view reflects DB state (and clears dirty/pendingRefresh).
      await loadSavedPlan(true);
      setMode('saved');
      setCategoryOrder(null);
      setCustomCategoryGaps({});
      setDirty(false);
      onComplete();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [activePlan, toast, onComplete, loadSavedPlan]);

  const pad = (n: number) => String(n).padStart(5, '0');

  const switchMode = (next: Mode) => {
    if (dirty) {
      const confirmed = window.confirm('You have unsaved edits. Switch view and discard them?');
      if (!confirmed) return;
    }
    setMode(next);
    setCategoryOrder(null);
    setCustomCategoryGaps({});
    setDirty(false);
  };

  const isSavedView = mode === 'saved' && savedRows.length > 0;

  return (
    <>
      <EnhancedActionButton
        label="Range Planner"
        icon={Shuffle}
        variant="purple"
        tooltip="Plan serial number ranges by category and brand"
        onClick={() => setIsOpen(true)}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              Serial Range Planner
              {isSavedView && (
                <Badge variant="outline" className="ml-2 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Saved • {formatRelative(savedUpdatedAt)}
                </Badge>
              )}
              {mode === 'compute' && savedRows.length > 0 && (
                <Badge variant="outline" className="ml-2 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Recompute preview
                </Badge>
              )}
              {mode === 'compute' && savedRows.length === 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  New plan (not yet saved)
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Plan serial number ranges for future assignment — organized by category then brand.
            </p>
          </DialogHeader>

          <Separator />

          <div className="flex-1 min-h-0 flex flex-col gap-3 py-2">
            {/* Mode toggle + refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => switchMode('saved')}
                  disabled={savedRows.length === 0}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-8 text-xs transition-colors',
                    mode === 'saved'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted text-foreground',
                    savedRows.length === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Database className="w-3.5 h-3.5" />
                  Saved Plan
                </button>
                <button
                  onClick={() => switchMode('compute')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-8 text-xs transition-colors border-l border-border',
                    mode === 'compute'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted text-foreground'
                  )}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Recompute from Inventory
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadSavedPlan(false)}
                disabled={loadingSaved}
                className="h-8 text-xs gap-1.5"
              >
                {loadingSaved
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />}
                Refresh
              </Button>

              {mode === 'compute' && savedRows.length > 0 && driftCount > 0 && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  {driftCount} brand drift vs saved
                </Badge>
              )}

              <div className="ml-auto flex items-center gap-2">
                {dirty && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    Unsaved edits
                  </Badge>
                )}
              </div>
            </div>

            {pendingRefresh && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Saved plan changed elsewhere. Refresh to load the latest (your edits will be discarded).</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => loadSavedPlan(false)}>
                  Refresh
                </Button>
              </div>
            )}

            {/* Compute-mode controls */}
            {mode === 'compute' && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm whitespace-nowrap">Category Gap:</Label>
                  <Input
                    type="number"
                    value={categoryGapPercent}
                    onChange={e => setCategoryGapPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    className="w-16 h-8"
                    min={0} max={100}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm whitespace-nowrap">Brand Gap:</Label>
                  <Input
                    type="number"
                    value={brandGapPercent}
                    onChange={e => setBrandGapPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    className="w-16 h-8"
                    min={0} max={100}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {categoryOrder && (
                    <Button variant="ghost" size="sm" onClick={resetOrder} className="text-xs h-7 text-amber-600 dark:text-amber-400">Reset Order</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7">Expand All</Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7">Collapse All</Button>
                </div>
              </div>
            )}

            {mode === 'saved' && (
              <div className="flex items-center gap-2 ml-auto justify-end">
                <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7">Expand All</Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7">Collapse All</Button>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <Badge variant="outline">
                {mode === 'saved' ? activePlan.reduce((s, c) => s + c.totalItems, 0) : activeItems.length} items
              </Badge>
              <Badge variant="outline">{activePlan.length} categories</Badge>
              <Badge variant="outline">
                <BarChart3 className="w-3 h-3 mr-1" />
                {pad(activePlan.length > 0 ? activePlan[0].rangeStart : 1)}–{pad(totalSerials)} total range
              </Badge>
              {Object.keys(customCategoryGaps).length > 0 && mode === 'compute' && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  {Object.keys(customCategoryGaps).length} custom gaps
                </Badge>
              )}
            </div>

            {/* Plan Preview */}
            <ScrollArea className="flex-1 h-[55vh]">
              <div className="space-y-1 pr-3">
                {loadingSaved && activePlan.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading saved plan…
                  </div>
                ) : activePlan.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No data to display.
                  </div>
                ) : activePlan.map((cat, catIndex) => {
                  const isExpanded = expandedCategories.has(cat.category);
                  return (
                    <div key={cat.category} className="rounded-lg border border-border overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(cat.category)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                        <Badge variant="outline" className={cn('font-medium text-xs', cat.color)}>
                          {cat.category}
                        </Badge>
                        <span className="text-sm font-medium tabular-nums">{cat.totalItems} items</span>
                        <span className="text-xs text-muted-foreground ml-auto tabular-nums font-mono">
                          {pad(cat.rangeStart)}–{pad(cat.rangeEnd)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border-emerald-500/30",
                            cat.hasCustomGap
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          +{cat.categoryGap} {cat.hasCustomGap ? '★' : 'cat gap'}
                        </Badge>
                        {mode === 'compute' && (
                          <div className="flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
                            <button
                              disabled={catIndex === 0}
                              onClick={(e) => { e.stopPropagation(); moveCategory(catIndex, 'up'); }}
                              className="p-0.5 rounded hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button
                              disabled={catIndex === activePlan.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveCategory(catIndex, 'down'); }}
                              className="p-0.5 rounded hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-border/50">
                          {cat.brands.map(b => {
                            const savedRow = savedBrandMap.get(savedBrandKey(cat.category, b.brand));
                            const drift = mode === 'compute' && savedRow && savedRow.items_used !== b.count;
                            return (
                              <div
                                key={b.brand}
                                className="flex items-center gap-3 px-4 py-1.5 pl-10 text-sm hover:bg-muted/30 transition-colors"
                              >
                                <span className="font-medium min-w-[100px]">{b.brand}</span>

                                {mode === 'saved' ? (
                                  <div className="flex items-center gap-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase">Used</Label>
                                    <Input
                                      type="number"
                                      value={b.count}
                                      onChange={e => editSavedBrand(cat.category, b.brand, { items_used: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-16 h-6 text-xs"
                                      min={0}
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                ) : (
                                  <span className="tabular-nums text-muted-foreground w-16 text-right">{b.count} items</span>
                                )}

                                {mode === 'saved' ? (
                                  <div className="flex items-center gap-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase">Start</Label>
                                    <Input
                                      type="number"
                                      value={b.rangeStart}
                                      onChange={e => editSavedBrand(cat.category, b.brand, { range_start: Math.max(1, parseInt(e.target.value) || 1) })}
                                      className="w-20 h-6 text-xs font-mono"
                                      min={1}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <Label className="text-[10px] text-muted-foreground uppercase">End</Label>
                                    <Input
                                      type="number"
                                      value={b.rangeEnd + b.gap}
                                      onChange={e => editSavedBrand(cat.category, b.brand, { range_end: Math.max(1, parseInt(e.target.value) || 1) })}
                                      className="w-20 h-6 text-xs font-mono"
                                      min={1}
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tabular-nums">
                                    {pad(b.rangeStart)}–{pad(b.rangeEnd)}
                                  </span>
                                )}

                                <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  +{b.gap} gap
                                </span>

                                {drift && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 ml-auto">
                                    saved: {savedRow!.items_used}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}

                          {/* Category gap footer with custom gap control (compute mode only) */}
                          {mode === 'compute' && (
                            <div className="flex items-center gap-3 px-4 py-2 pl-10 text-xs text-muted-foreground bg-muted/20">
                              <span className="italic flex-1">
                                Category gap: +{cat.categoryGap} reserved → range ends at {pad(cat.rangeEnd)}
                              </span>
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                {cat.hasCustomGap ? (
                                  <>
                                    <Label className="text-xs whitespace-nowrap text-amber-600 dark:text-amber-400">Custom:</Label>
                                    <Input
                                      type="number"
                                      value={customCategoryGaps[cat.category]}
                                      onChange={e => setCustomGap(cat.category, parseInt(e.target.value) || 0)}
                                      className="w-20 h-6 text-xs"
                                      min={0}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                                      onClick={() => removeCustomGap(cat.category)}
                                    >
                                      Reset
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs gap-1"
                                    onClick={() => setCustomGap(cat.category, cat.categoryGap)}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Custom Gap
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            <Button onClick={savePlan} disabled={saving || activePlan.length === 0} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {mode === 'saved' && dirty ? 'Save Changes' : mode === 'saved' ? 'Re-save Plan' : 'Save Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
