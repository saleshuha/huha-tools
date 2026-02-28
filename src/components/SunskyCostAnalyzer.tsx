import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DollarSign, Loader2, Download, Search, StopCircle, CheckCircle, XCircle, Package } from 'lucide-react';
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
  status: 'pending' | 'found' | 'not_found' | 'error';
  errorMessage?: string;
}

interface SunskyCostAnalyzerProps {
  inventory: AsinInventoryItem[];
  onComplete?: () => void;
}

export function SunskyCostAnalyzer({ inventory, onComplete }: SunskyCostAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, found: 0, notFound: 0 });
  const [scanComplete, setScanComplete] = useState(false);
  const cancelRef = useRef(false);
  const { toast } = useToast();

  // Filter in-stock items with SKUs
  const instockItems = useMemo(() => {
    return inventory.filter(item => item.quantity > 0 && item.sku && item.sku.trim() !== '');
  }, [inventory]);

  const instockCount = instockItems.length;

  const callSunskyAPI = useCallback(async (action: string, data: any): Promise<any> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('sunsky-api', {
      body: { action, ...data }
    });

    if (response.error) throw new Error(response.error.message || 'API error');
    return response.data;
  }, []);

  const startScan = async () => {
    if (instockItems.length === 0) {
      toast({ title: 'No Items', description: 'No in-stock items with SKUs found.', variant: 'destructive' });
      return;
    }

    cancelRef.current = false;
    setIsScanning(true);
    setScanComplete(false);

    const items: AnalyzedItem[] = instockItems.map(item => ({
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
    setProgress({ current: 0, total: items.length, found: 0, notFound: 0 });

    // First try to match from local sunsky_skus table
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const skuCodes = items.map(i => i.sku);
    
    // Fetch local sunsky_skus in batches
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

    // Process items - use local data first, then API for remaining
    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;

      const item = items[i];
      const localMatch = localMatches.get(item.sku);

      if (localMatch && localMatch.cost !== null) {
        item.sunskyCost = localMatch.cost;
        item.sunskyTitle = localMatch.title;
        item.totalCost = localMatch.cost * item.quantity;
        item.status = 'found';
        found++;
      } else {
        // Try live API lookup
        try {
          const result = await callSunskyAPI('getProductDetails', { itemNo: item.sku });
          if (result?.result === 'success' && result?.data?.product) {
            const product = result.data.product;
            const price = parseFloat(product.price || product.originalPrice || '0');
            item.sunskyCost = price;
            item.sunskyTitle = product.title || product.productTitle || null;
            item.totalCost = price * item.quantity;
            item.status = 'found';
            found++;
          } else {
            item.status = 'not_found';
            notFound++;
          }
        } catch (err: any) {
          item.status = 'not_found';
          item.errorMessage = err.message;
          notFound++;
        }

        // Small delay between API calls
        if (i < items.length - 1 && !cancelRef.current) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Update state in real-time
      setAnalyzedItems([...items]);
      setProgress({ current: i + 1, total: items.length, found, notFound });
    }

    setIsScanning(false);
    setScanComplete(true);
    toast({
      title: cancelRef.current ? 'Scan Cancelled' : 'Scan Complete',
      description: `Found pricing for ${found} of ${items.length} items.`
    });
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const exportToCSV = () => {
    const foundItems = analyzedItems.filter(i => i.status === 'found' || i.status === 'not_found');
    if (foundItems.length === 0) return;

    const totalInventoryCost = analyzedItems
      .filter(i => i.status === 'found')
      .reduce((sum, i) => sum + (i.totalCost || 0), 0);

    const headers = ['SKU', 'ASIN', 'Title', 'Sunsky Title', 'In-Stock Qty', 'Sunsky Unit Cost ($)', 'Total Cost ($)', 'Status'];
    const rows = analyzedItems.map(i => [
      i.sku,
      i.asin,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.sunskyTitle || '-').replace(/"/g, '""')}"`,
      i.quantity,
      i.sunskyCost !== null ? i.sunskyCost.toFixed(2) : '-',
      i.totalCost !== null ? i.totalCost.toFixed(2) : '-',
      i.status === 'found' ? 'Found' : 'Not Found'
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['', '', '', 'TOTAL INVENTORY COST', '', '', totalInventoryCost.toFixed(2), '']);

    const csv = [headers.join(','), ...rows.map(r => Array.isArray(r) && r.length === 0 ? '' : (r as any[]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunsky-cost-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: 'Cost analysis CSV downloaded.' });
  };

  const totalCostSum = analyzedItems
    .filter(i => i.status === 'found')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);

  const totalUnits = analyzedItems
    .filter(i => i.status === 'found')
    .reduce((sum, i) => sum + i.quantity, 0);

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isScanning) setIsOpen(open); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs rounded-lg border-dashed">
          <DollarSign className="w-3.5 h-3.5" />
          Sunsky Cost Scan
          {instockCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {instockCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Sunsky In-Stock Cost Analyzer
          </DialogTitle>
          <DialogDescription>
            Scan your in-stock inventory against the Sunsky catalog to calculate total inventory cost.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        {(isScanning || scanComplete) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{progress.found}</div>
              <div className="text-xs text-muted-foreground">Found</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{progress.notFound}</div>
              <div className="text-xs text-muted-foreground">Not Found</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalUnits}</div>
              <div className="text-xs text-muted-foreground">Units Costed</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">${totalCostSum.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isScanning && (
          <div className="space-y-2">
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progress.current} of {progress.total}</span>
              <span>{percentage.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Results Table */}
        {analyzedItems.length > 0 && (
          <ScrollArea className="flex-1 max-h-[400px] border rounded-lg">
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
                  <TableRow key={item.id} className={item.status === 'not_found' ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="font-mono text-xs">{item.asin}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]" title={item.sunskyTitle || item.title}>
                      {item.sunskyTitle || item.title}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.sunskyCost !== null ? `$${item.sunskyCost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.totalCost !== null ? `$${item.totalCost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />}
                      {item.status === 'found' && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                      {item.status === 'not_found' && <XCircle className="w-4 h-4 text-orange-500 mx-auto" />}
                      {item.status === 'error' && <XCircle className="w-4 h-4 text-destructive mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Empty state */}
        {!isScanning && !scanComplete && (
          <div className="text-center py-8 space-y-3">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <div>
              <p className="font-medium">{instockCount} in-stock items with SKUs</p>
              <p className="text-sm text-muted-foreground">
                This will check each SKU against local Sunsky data and the live API to fetch unit costs.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:justify-between">
          <div className="flex gap-2">
            {!isScanning && !scanComplete && (
              <Button onClick={startScan} disabled={instockCount === 0} className="gap-2">
                <Search className="w-4 h-4" />
                Start Cost Scan
              </Button>
            )}
            {isScanning && (
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <StopCircle className="w-4 h-4" />
                Stop Scan
              </Button>
            )}
            {scanComplete && (
              <>
                <Button onClick={startScan} variant="outline" className="gap-2">
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
