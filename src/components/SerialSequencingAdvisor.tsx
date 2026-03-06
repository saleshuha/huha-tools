import { useState, useMemo, useCallback } from 'react';
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
  Layers, Save, ChevronDown, ChevronRight, Loader2, Shuffle, BarChart3
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
  rangeEnd: number; // includes category gap
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface SerialSequencingAdvisorProps {
  inventory: AsinInventoryItem[];
  onComplete: () => void;
}

export function SerialSequencingAdvisor({ inventory, onComplete }: SerialSequencingAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryGapPercent, setCategoryGapPercent] = useState(20);
  const [brandGapPercent, setBrandGapPercent] = useState(10);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Active items only
  const activeItems = useMemo(() =>
    inventory.filter(item => item.isActive && item.quantity > 0),
    [inventory]
  );

  // Group by category → brand with counts
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

  // Compute the full range plan
  const plan = useMemo((): CategoryPlan[] => {
    // Build category list sorted by total count descending
    const categories: { category: string; color: string; totalItems: number; brands: { brand: string; count: number }[] }[] = [];

    categoryBrandCounts.forEach((val, category) => {
      const brands = Array.from(val.brands.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => a.brand.localeCompare(b.brand));
      const totalItems = brands.reduce((s, b) => s + b.count, 0);
      categories.push({ category, color: val.color, totalItems, brands });
    });

    categories.sort((a, b) => b.totalItems - a.totalItems);

    // Sequential range assignment
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

      const categoryGap = Math.ceil(cat.totalItems * categoryGapPercent / 100);
      const catEnd = cursor + categoryGap - 1;

      result.push({
        category: cat.category,
        color: cat.color,
        totalItems: cat.totalItems,
        brands: brandBlocks,
        categoryGap,
        rangeStart: catStart,
        rangeEnd: catEnd,
      });

      cursor = catEnd + 1;
    });

    return result;
  }, [categoryBrandCounts, categoryGapPercent, brandGapPercent]);

  const totalSerials = plan.length > 0 ? plan[plan.length - 1].rangeEnd : 0;

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(plan.map(p => p.category)));
  const collapseAll = () => setExpandedCategories(new Set());

  // Save plan to serial_range_directory
  const savePlan = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete existing ranges
      await (supabase as any).from('serial_range_directory').delete().eq('user_id', user.id);

      // Insert new ranges (one per brand per category)
      const rows = plan.flatMap(cat =>
        cat.brands.map(b => ({
          user_id: user.id,
          category: cat.category,
          brand: b.brand,
          range_start: b.rangeStart,
          range_end: b.rangeEnd + b.gap, // include gap in reserved range
          items_used: b.count,
        }))
      );

      if (rows.length > 0) {
        const { error } = await (supabase as any).from('serial_range_directory').insert(rows);
        if (error) throw error;
      }

      toast({ title: 'Plan saved', description: `${rows.length} brand ranges saved to directory.` });
      onComplete();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [plan, toast, onComplete]);

  const pad = (n: number) => String(n).padStart(5, '0');

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
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Plan serial number ranges for future assignment — organized by category then brand.
            </p>
          </DialogHeader>

          <Separator />

          <div className="flex-1 min-h-0 overflow-hidden space-y-3 py-2">
            {/* Controls */}
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
                <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7">Expand All</Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7">Collapse All</Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <Badge variant="outline">{activeItems.length} items</Badge>
              <Badge variant="outline">{plan.length} categories</Badge>
              <Badge variant="outline">
                <BarChart3 className="w-3 h-3 mr-1" />
                {pad(1)}–{pad(totalSerials)} total range
              </Badge>
            </div>

            {/* Plan Preview */}
            <ScrollArea className="flex-1 h-[55vh]">
              <div className="space-y-1 pr-3">
                {plan.map(cat => {
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
                        <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          +{cat.categoryGap} cat gap
                        </Badge>
                      </button>

                      {/* Brand Rows */}
                      {isExpanded && (
                        <div className="divide-y divide-border/50">
                          {cat.brands.map(b => (
                            <div
                              key={b.brand}
                              className="flex items-center gap-3 px-4 py-1.5 pl-10 text-sm hover:bg-muted/30 transition-colors"
                            >
                              <span className="font-medium min-w-[100px]">{b.brand}</span>
                              <span className="tabular-nums text-muted-foreground w-16 text-right">{b.count} items</span>
                              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tabular-nums">
                                {pad(b.rangeStart)}–{pad(b.rangeEnd)}
                              </span>
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                                +{b.gap} gap
                              </span>
                            </div>
                          ))}
                          {/* Category gap footer */}
                          <div className="flex items-center gap-3 px-4 py-1.5 pl-10 text-xs text-muted-foreground bg-muted/20">
                            <span className="italic">
                              Category gap: +{cat.categoryGap} reserved → range ends at {pad(cat.rangeEnd)}
                            </span>
                          </div>
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
            <Button onClick={savePlan} disabled={saving || plan.length === 0} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
