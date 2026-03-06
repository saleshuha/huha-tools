import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DollarSign, Loader2, Download, Search, StopCircle, CheckCircle, XCircle, Package, Pause, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AsinInventoryItem } from '@/hooks/useAsinInventory';
import { supabase } from '@/integrations/supabase/client';

interface AnalyzedItem {
  id: string;
  asin: string;
  sku: string;
  title: string;
  quantity: number;
  sunskyCost: number | null;
  sunskyTitle: string | null;
  totalCost: number | null;
  status: 'pending' | 'found' | 'not_found' | 'error' | 'cached';
  source?: 'cache' | 'local' | 'api';
  errorMessage?: string;
}

type ScanState = 'idle' | 'scanning' | 'paused' | 'complete';

interface SunskyCostAnalyzerProps {
  inventory: AsinInventoryItem[];
  onComplete?: () => void;
}

export function SunskyCostAnalyzer({ inventory, onComplete }: SunskyCostAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, found: 0, notFound: 0, cached: 0 });
  const [isLoadingCached, setIsLoadingCached] = useState(false);
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  // All items with SKUs (regardless of stock)
  const skuItems = useMemo(() => {
    return inventory.filter(item => item.sku && item.sku.trim() !== '');
  }, [inventory]);

  // In-stock items with SKUs
  const instockSkuItems = useMemo(() => {
    return skuItems.filter(item => item.quantity > 0);
  }, [skuItems]);

  const isRunning = scanState === 'scanning' || scanState === 'paused';

  // Load cached data when dialog opens
  const loadCachedData = useCallback(async () => {
    if (skuItems.length === 0) return;
    setIsLoadingCached(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const skuCodes = skuItems.map(i => i.sku || '').filter(Boolean);
      const cachedCosts = new Map<string, { cost: number | null; title: string | null }>();

      for (let i = 0; i < skuCodes.length; i += 200) {
        const batch = skuCodes.slice(i, i + 200);
        const { data: cached } = await supabase
          .from('sunsky_product_costs' as any)
          .select('sku_code, cost, title')
          .eq('user_id', user.id)
          .in('sku_code', batch);
        if (cached) {
          (cached as any[]).forEach((s: any) => cachedCosts.set(s.sku_code, { cost: s.cost, title: s.title }));
        }
      }

      if (cachedCosts.size > 0) {
        const items: AnalyzedItem[] = skuItems.map(item => {
          const cached = cachedCosts.get(item.sku || '');
          const cost = cached?.cost ? Number(cached.cost) : null;
          return {
            id: item.id,
            asin: item.asin,
            sku: item.sku || '',
            title: item.title || item.asin,
            quantity: item.quantity,
            sunskyCost: cost,
            sunskyTitle: cached?.title || null,
            totalCost: cost !== null && item.quantity > 0 ? cost * item.quantity : null,
            status: cost !== null ? 'cached' as const : 'not_found' as const,
            source: cost !== null ? 'cache' as const : undefined,
          };
        });

        const foundCount = items.filter(i => i.status === 'cached').length;
        const notFoundCount = items.filter(i => i.status === 'not_found').length;

        setAnalyzedItems(items);
        setProgress({ current: items.length, total: items.length, found: foundCount, notFound: notFoundCount, cached: foundCount });
        setScanState('complete');
      }
    } catch (e) {
      console.warn('Failed to load cached costs:', e);
    } finally {
      setIsLoadingCached(false);
    }
  }, [skuItems]);

  const handleOpenChange = (open: boolean) => {
    if (isRunning) return;
    setIsOpen(open);
    if (open && scanState === 'idle' && analyzedItems.length === 0) {
      setTimeout(() => loadCachedData(), 100);
    }
  };

  const callSunskyAPI = useCallback(async (action: string, data: any): Promise<any> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('sunsky-api', {
      body: { action, ...data }
    });

    if (response.error) throw new Error(response.error.message || 'API error');
    return response.data;
  }, []);

  // Extract price from Sunsky API response data (handles multiple structures)
  const extractPrice = (data: any): number | null => {
    if (!data) return null;
    
    // Try multiple price paths
    const candidates = [
      data.price,
      data.originalPrice,
      data.priceUs,
      data.salePrice,
      data.wholeSalePrice,
      data.wholesalePrice,
      data.unitPrice,
    ];

    for (const val of candidates) {
      if (val !== undefined && val !== null && val !== '') {
        const parsed = typeof val === 'number' ? val : parseFloat(String(val));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return null;
  };

  const extractTitle = (data: any): string | null => {
    if (!data) return null;
    return data.title || data.productTitle || data.name || data.itemName || null;
  };

  // Wait while paused
  const waitWhilePaused = (): Promise<void> => {
    if (!pauseRef.current) return Promise.resolve();
    return new Promise(resolve => {
      resumeResolverRef.current = resolve;
    });
  };

  // Cache cost to DB
  const cacheCost = async (userId: string, skuCode: string, cost: number | null, title: string | null) => {
    if (cost === null) return;
    try {
      await supabase
        .from('sunsky_product_costs' as any)
        .upsert({
          user_id: userId,
          sku_code: skuCode,
          cost,
          title,
          currency: 'USD',
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,sku_code' });
    } catch (e) {
      console.warn('Cache upsert failed:', e);
    }
  };

  const startScan = async () => {
    if (skuItems.length === 0) {
      toast({ title: 'No Items', description: 'No items with SKUs found.', variant: 'destructive' });
      return;
    }

    cancelRef.current = false;
    pauseRef.current = false;
    setScanState('scanning');

    const items: AnalyzedItem[] = skuItems.map(item => ({
      id: item.id,
      asin: item.asin,
      sku: item.sku || '',
      title: item.title || item.asin,
      quantity: item.quantity,
      sunskyCost: null,
      sunskyTitle: null,
      totalCost: null,
      status: 'pending'
    }));

    setAnalyzedItems(items);
    setProgress({ current: 0, total: items.length, found: 0, notFound: 0, cached: 0 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const skuCodes = items.map(i => i.sku);

    // Tier 1: Load from sunsky_product_costs cache
    const cachedCosts = new Map<string, { cost: number | null; title: string | null }>();
    for (let i = 0; i < skuCodes.length; i += 200) {
      const batch = skuCodes.slice(i, i + 200);
      const { data: cached } = await supabase
        .from('sunsky_product_costs' as any)
        .select('sku_code, cost, title')
        .eq('user_id', user.id)
        .in('sku_code', batch);
      if (cached) {
        (cached as any[]).forEach((s: any) => cachedCosts.set(s.sku_code, { cost: s.cost, title: s.title }));
      }
    }

    // Tier 2: Load from sunsky_skus local table
    const localMatches = new Map<string, { cost: number | null; title: string | null }>();
    for (let i = 0; i < skuCodes.length; i += 200) {
      const batch = skuCodes.slice(i, i + 200);
      const { data: localSkus } = await supabase
        .from('sunsky_skus')
        .select('sku_code, cost, title')
        .eq('user_id', user.id)
        .in('sku_code', batch);
      if (localSkus) {
        localSkus.forEach(s => localMatches.set(s.sku_code, { cost: s.cost, title: s.title }));
      }
    }

    let found = 0;
    let notFound = 0;
    let cached = 0;

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;

      // Wait if paused
      if (pauseRef.current) {
        await waitWhilePaused();
      }
      if (cancelRef.current) break;

      const item = items[i];

      // Tier 1: Cache lookup
      const cachedMatch = cachedCosts.get(item.sku);
      if (cachedMatch && cachedMatch.cost !== null) {
        item.sunskyCost = Number(cachedMatch.cost);
        item.sunskyTitle = cachedMatch.title;
        item.totalCost = item.quantity > 0 ? item.sunskyCost * item.quantity : 0;
        item.status = 'cached';
        item.source = 'cache';
        found++;
        cached++;
      }
      // Tier 2: Local sunsky_skus
      else if (localMatches.has(item.sku) && localMatches.get(item.sku)!.cost !== null) {
        const local = localMatches.get(item.sku)!;
        item.sunskyCost = Number(local.cost);
        item.sunskyTitle = local.title;
        item.totalCost = item.quantity > 0 ? item.sunskyCost * item.quantity : 0;
        item.status = 'found';
        item.source = 'local';
        found++;
        // Also cache for future
        await cacheCost(user.id, item.sku, item.sunskyCost, item.sunskyTitle);
      }
      // Tier 3: Live API
      else {
        try {
          const result = await callSunskyAPI('getProductDetails', { itemNo: item.sku });
          
          console.log(`[CostScan] SKU=${item.sku} API response:`, JSON.stringify(result).substring(0, 300));

          // The edge function returns { result: 'success', data: <raw product data> }
          // or { result: 'error', message: '...', data: null }
          if (result?.result === 'success' && result?.data) {
            const price = extractPrice(result.data);
            const title = extractTitle(result.data);

            if (price !== null) {
              item.sunskyCost = price;
              item.sunskyTitle = title;
              item.totalCost = item.quantity > 0 ? price * item.quantity : 0;
              item.status = 'found';
              item.source = 'api';
              found++;
              // Cache for future
              await cacheCost(user.id, item.sku, price, title);
            } else {
              item.status = 'not_found';
              item.errorMessage = 'No price in response';
              notFound++;
            }
          } else {
            item.status = 'not_found';
            item.errorMessage = result?.message || 'Product not found';
            notFound++;
          }
        } catch (err: any) {
          item.status = 'error';
          item.errorMessage = err.message;
          notFound++;
        }

        // Delay between API calls
        if (i < items.length - 1 && !cancelRef.current) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      setAnalyzedItems([...items]);
      setProgress({ current: i + 1, total: items.length, found, notFound, cached });
    }

    setScanState('complete');
    toast({
      title: cancelRef.current ? 'Scan Stopped' : 'Scan Complete',
      description: `Found pricing for ${found} of ${items.length} items (${cached} from cache).`
    });
    onComplete?.();
  };

  const handlePause = () => {
    pauseRef.current = true;
    setScanState('paused');
  };

  const handleResume = () => {
    pauseRef.current = false;
    setScanState('scanning');
    if (resumeResolverRef.current) {
      resumeResolverRef.current();
      resumeResolverRef.current = null;
    }
  };

  const handleStop = () => {
    cancelRef.current = true;
    pauseRef.current = false;
    // If paused, resolve to let the loop exit
    if (resumeResolverRef.current) {
      resumeResolverRef.current();
      resumeResolverRef.current = null;
    }
  };

  const exportToCSV = () => {
    if (analyzedItems.length === 0) return;

    const instockCosted = analyzedItems.filter(i => (i.status === 'found' || i.status === 'cached') && i.quantity > 0);
    const totalInStockCost = instockCosted.reduce((sum, i) => sum + (i.totalCost || 0), 0);
    const totalInStockUnits = instockCosted.reduce((sum, i) => sum + i.quantity, 0);

    const headers = ['SKU', 'ASIN', 'Title', 'Sunsky Title', 'In-Stock Qty', 'Sunsky Unit Cost ($)', 'Total Cost ($)', 'Status', 'Source'];
    const rows = analyzedItems.map(i => [
      i.sku,
      i.asin,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.sunskyTitle || '-').replace(/"/g, '""')}"`,
      i.quantity,
      i.sunskyCost !== null ? i.sunskyCost.toFixed(2) : '-',
      i.totalCost !== null && i.totalCost > 0 ? i.totalCost.toFixed(2) : '-',
      i.status === 'found' || i.status === 'cached' ? 'Found' : 'Not Found',
      i.source || '-'
    ]);

    rows.push([]);
    rows.push(['', '', '', 'IN-STOCK COSTED ITEMS', totalInStockUnits, '', totalInStockCost.toFixed(2), '', ''] as any);

    const csv = [headers.join(','), ...rows.map(r => Array.isArray(r) && r.length === 0 ? '' : (r as any[]).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunsky-cost-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'Cost analysis CSV downloaded.' });
  };

  // Summary calculations - only in-stock items
  const instockCosted = analyzedItems.filter(i => (i.status === 'found' || i.status === 'cached') && i.quantity > 0);
  const totalCostSum = instockCosted.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const totalUnits = instockCosted.reduce((sum, i) => sum + i.quantity, 0);
  const totalCosted = analyzedItems.filter(i => i.status === 'found' || i.status === 'cached').length;
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs rounded-lg border-dashed">
          <DollarSign className="w-3.5 h-3.5" />
          Sunsky Cost Scan
          {skuItems.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {skuItems.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Sunsky Inventory Cost Analyzer
          </DialogTitle>
          <DialogDescription>
            Scans all SKU items against Sunsky catalog. Costs are cached for future scans. Total cost calculated for in-stock units only.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        {(isRunning || scanState === 'complete') && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{totalCosted}</div>
              <div className="text-xs text-muted-foreground">Costed</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{progress.notFound}</div>
              <div className="text-xs text-muted-foreground">Not Found</div>
            </div>
            <div className="bg-violet-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-violet-600">{progress.cached}</div>
              <div className="text-xs text-muted-foreground">From Cache</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalUnits}</div>
              <div className="text-xs text-muted-foreground">In-Stock Units</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">${totalCostSum.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">In-Stock Cost</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Progress value={percentage} className="h-2 flex-1" />
              {scanState === 'paused' && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Paused</Badge>
              )}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progress.current} of {progress.total}</span>
              <span>{percentage.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Results Table */}
        {analyzedItems.length > 0 && (
          <ScrollArea className="h-[50vh] w-full border rounded-lg">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[100px]">ASIN</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[80px] text-right">Qty</TableHead>
                  <TableHead className="w-[100px] text-right">Unit Cost</TableHead>
                  <TableHead className="w-[100px] text-right">Total Cost</TableHead>
                  <TableHead className="w-[80px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyzedItems.map((item) => (
                  <TableRow key={item.id} className={item.status === 'not_found' || item.status === 'error' ? 'opacity-60' : item.quantity === 0 ? 'opacity-40' : ''}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="font-mono text-xs">{item.asin}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]" title={item.sunskyTitle || item.title}>
                      {item.sunskyTitle || item.title}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.quantity > 0 ? item.quantity : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.sunskyCost !== null ? `$${item.sunskyCost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.totalCost !== null && item.totalCost > 0 ? `$${item.totalCost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />}
                      {item.status === 'found' && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                      {item.status === 'cached' && <CheckCircle className="w-4 h-4 text-violet-500 mx-auto" />}
                      {item.status === 'not_found' && <XCircle className="w-4 h-4 text-orange-500 mx-auto" />}
                      {item.status === 'error' && <XCircle className="w-4 h-4 text-destructive mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        )}

        {/* Empty state / Loading cached */}
        {scanState === 'idle' && (
          <div className="text-center py-8 space-y-3">
            {isLoadingCached ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-muted-foreground/50 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading cached cost data...</p>
              </>
            ) : (
              <>
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="font-medium">{skuItems.length} items with SKUs ({instockSkuItems.length} in-stock)</p>
                  <p className="text-sm text-muted-foreground">
                    Fetches costs for all SKU items, caches results, and calculates total cost for in-stock units.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:justify-between">
          <div className="flex gap-2">
            {scanState === 'idle' && (
              <Button onClick={startScan} disabled={skuItems.length === 0} className="gap-2">
                <Search className="w-4 h-4" />
                Start Cost Scan
              </Button>
            )}
            {scanState === 'scanning' && (
              <>
                <Button variant="outline" onClick={handlePause} className="gap-2">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button variant="destructive" onClick={handleStop} className="gap-2">
                  <StopCircle className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}
            {scanState === 'paused' && (
              <>
                <Button onClick={handleResume} className="gap-2">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
                <Button variant="destructive" onClick={handleStop} className="gap-2">
                  <StopCircle className="w-4 h-4" />
                  Stop
                </Button>
              </>
            )}
            {scanState === 'complete' && (
              <>
                <Button onClick={() => { setScanState('idle'); setAnalyzedItems([]); }} variant="outline" className="gap-2">
                  <Search className="w-4 h-4" />
                  Re-Scan
                </Button>
                <Button onClick={exportToCSV} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
