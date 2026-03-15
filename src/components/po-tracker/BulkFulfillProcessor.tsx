import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Warehouse, Loader2, CheckCircle2, XCircle, AlertTriangle, 
  Clock, Package, Play, Square, Printer, Download, FileText 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BulkFulfillResult } from './BulkFulfillSummary';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface EligibleOrder {
  order: any; // POOrder
  match: any; // inventory match
  pendingQty: number;
}

type Phase = 'preview' | 'processing' | 'summary';
type ItemStatus = 'waiting' | 'processing' | 'success' | 'failed' | 'skipped';

interface ProcessingItem extends EligibleOrder {
  status: ItemStatus;
  fulfillQty: number;
  stockBefore: number;
  stockAfter: number;
  error?: string;
}

interface BulkFulfillProcessorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibleOrders: EligibleOrder[];
  onComplete: () => void;
}

export const BulkFulfillProcessor: React.FC<BulkFulfillProcessorProps> = ({
  open,
  onOpenChange,
  eligibleOrders,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('preview');
  const [items, setItems] = useState<ProcessingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [completedTimestamp, setCompletedTimestamp] = useState<Date>(new Date());
  const cancelledRef = useRef(false);

  // Initialize items when dialog opens
  React.useEffect(() => {
    if (open && eligibleOrders.length > 0) {
      // Pre-compute stock allocation
      const stockMap = new Map<string, number>();
      const processed: ProcessingItem[] = eligibleOrders.map(eo => {
        const asinKey = (eo.order.asin || '').toUpperCase();
        if (!stockMap.has(asinKey)) stockMap.set(asinKey, eo.match.quantity);
        const stockBefore = stockMap.get(asinKey)!;
        const fulfillQty = Math.min(stockBefore, eo.pendingQty);
        const stockAfter = Math.max(0, stockBefore - fulfillQty);
        stockMap.set(asinKey, stockAfter);
        return {
          ...eo,
          status: fulfillQty > 0 ? 'waiting' as ItemStatus : 'skipped' as ItemStatus,
          fulfillQty,
          stockBefore,
          stockAfter,
          error: fulfillQty <= 0 ? 'Insufficient stock' : undefined,
        };
      });
      setItems(processed);
      setPhase('preview');
      setCurrentIndex(-1);
      cancelledRef.current = false;
    }
  }, [open, eligibleOrders]);

  const stats = useMemo(() => {
    const actionable = items.filter(i => i.status !== 'skipped');
    const successful = items.filter(i => i.status === 'success');
    const failed = items.filter(i => i.status === 'failed');
    const skipped = items.filter(i => i.status === 'skipped');
    return {
      total: items.length,
      actionable: actionable.length,
      successful: successful.length,
      failed: failed.length,
      skipped: skipped.length,
      totalQty: items.reduce((s, i) => s + i.fulfillQty, 0),
      fulfilledQty: successful.reduce((s, i) => s + i.fulfillQty, 0),
    };
  }, [items]);

  // Group by PO
  const groupedByPO = useMemo(() => {
    const map = new Map<string, ProcessingItem[]>();
    items.forEach(item => {
      const po = item.order.po_number;
      if (!map.has(po)) map.set(po, []);
      map.get(po)!.push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const fulfillWithFallback = async (poNumber: string, quantity: number, orderInfo: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');
    const response = await fetch('https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/fulfill-from-stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM'
      },
      body: JSON.stringify({
        poNumber,
        quantity,
        asin: orderInfo.asin,
        title: orderInfo.title,
        originalQuantity: orderInfo.quantity,
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return await response.json();
  };

  const waitForTaskResult = async (taskId: string, timeoutMs = 90000) => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const { data, error } = await supabase
        .from('background_tasks')
        .select('status, metadata')
        .eq('id', taskId)
        .maybeSingle();

      if (error) {
        throw new Error(`Unable to check fulfillment task: ${error.message}`);
      }

      if (data?.status === 'completed') {
        return { ok: true as const, error: null as string | null };
      }

      if (data?.status === 'failed') {
        return {
          ok: false as const,
          error: (data.metadata as any)?.error || 'Fulfillment task failed',
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    return {
      ok: false as const,
      error: 'Fulfillment task timeout. Please retry.',
    };
  };

  const startProcessing = async () => {
    setPhase('processing');
    cancelledRef.current = false;

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      if (cancelledRef.current) break;
      const item = updatedItems[i];

      if (item.status === 'skipped') {
        setCurrentIndex(i);
        continue;
      }

      // Set processing
      updatedItems[i] = { ...updatedItems[i], status: 'processing' };
      setItems([...updatedItems]);
      setCurrentIndex(i);

      try {
        let data, error;
        try {
          const result = await supabase.functions.invoke('fulfill-from-stock', {
            body: {
              poNumber: item.order.po_number,
              quantity: item.fulfillQty,
              asin: item.order.asin,
              title: item.order.title,
              originalQuantity: item.order.quantity,
            }
          });
          data = result.data;
          error = result.error;
        } catch (invokeError: any) {
          error = invokeError;
        }

        if (error) {
          try {
            data = await fulfillWithFallback(item.order.po_number, item.fulfillQty, {
              asin: item.order.asin,
              title: item.order.title,
              quantity: item.order.quantity,
            });
            error = null;
          } catch {
            // Both failed
          }
        }

        updatedItems[i] = {
          ...updatedItems[i],
          status: error ? 'failed' : 'success',
          error: error?.message,
        };
      } catch (err: any) {
        updatedItems[i] = {
          ...updatedItems[i],
          status: 'failed',
          error: err?.message || 'Unknown error',
        };
      }

      setItems([...updatedItems]);
    }

    setCompletedTimestamp(new Date());
    setPhase('summary');
  };

  const handleCancel = () => {
    cancelledRef.current = true;
  };

  const handleClose = () => {
    // Only trigger data refresh when closing after summary (processing is done)
    if (phase === 'summary') {
      onComplete();
    }
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setPhase('preview');
      setItems([]);
      setCurrentIndex(-1);
    }, 300);
  };

  const handleExportCSV = () => {
    const headers = ['PO Number', 'ASIN', 'SKU', 'Title', 'Pending Qty', 'Fulfilled Qty', 'Stock Before', 'Stock After', 'Status', 'Error'];
    const rows = items.map(i => [
      i.order.po_number,
      i.order.asin || '',
      i.order.sku_code || '',
      `"${(i.order.title || '').replace(/"/g, '""')}"`,
      i.pendingQty,
      i.fulfillQty,
      i.stockBefore,
      i.stockAfter,
      i.status,
      i.error || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fulfillment-report-${format(completedTimestamp, 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: ItemStatus) => {
    switch (status) {
      case 'waiting': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const progressPercent = phase === 'processing' && items.length > 0
    ? ((currentIndex + 1) / items.length) * 100
    : phase === 'summary' ? 100 : 0;

  return (
    <Dialog open={open} onOpenChange={phase === 'processing' ? undefined : handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        <DialogHeader className="print:mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Warehouse className="h-5 w-5 text-primary" />
            {phase === 'preview' && 'Bulk Fulfillment — Review Items'}
            {phase === 'processing' && 'Processing Fulfillment...'}
            {phase === 'summary' && 'Fulfillment Summary Report'}
          </DialogTitle>
          {phase === 'summary' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {format(completedTimestamp, 'PPpp')}
            </div>
          )}
        </DialogHeader>

        {/* Progress Bar (processing + summary) */}
        {(phase === 'processing' || phase === 'summary') && (
          <div className="space-y-1.5">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {phase === 'processing'
                  ? `Processing ${currentIndex + 1} of ${items.length}...`
                  : `Completed — ${stats.successful} successful, ${stats.failed} failed`}
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5">
          <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground font-medium">Total Items</div>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {phase === 'preview' ? stats.actionable : stats.successful}
            </div>
            <div className="text-xs text-green-600/80 font-medium">
              {phase === 'preview' ? 'Eligible' : 'Successful'}
            </div>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center">
            <div className="text-2xl font-bold text-destructive">
              {phase === 'preview' ? stats.skipped : stats.failed}
            </div>
            <div className="text-xs text-destructive/80 font-medium">
              {phase === 'preview' ? 'Insufficient Stock' : 'Failed'}
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalQty}</div>
            <div className="text-xs text-primary/80 font-medium">Total Qty</div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {phase === 'preview' ? stats.totalQty : stats.fulfilledQty}
            </div>
            <div className="text-xs text-blue-600/80 font-medium">
              {phase === 'preview' ? 'Planned Qty' : 'Fulfilled Qty'}
            </div>
          </div>
        </div>

        {/* Items Table grouped by PO */}
        <div className="rounded-xl border border-border/30 overflow-hidden">
          {groupedByPO.map(([poNumber, poItems], groupIdx) => (
            <div key={poNumber}>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border/20">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">PO: {poNumber}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {poItems.length} item{poItems.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <Table>
                {groupIdx === 0 && (
                  <TableHeader>
                    <TableRow className="bg-muted/20 text-xs">
                      <TableHead className="w-10 text-center">Status</TableHead>
                      <TableHead className="min-w-[120px]">ASIN / SKU</TableHead>
                      <TableHead className="min-w-[180px]">Title</TableHead>
                      <TableHead className="text-center w-20">Pending</TableHead>
                      <TableHead className="text-center w-20">Fulfill</TableHead>
                      <TableHead className="text-center w-24">Stock Before</TableHead>
                      <TableHead className="text-center w-24">Stock After</TableHead>
                      <TableHead className="text-center w-24">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                <TableBody>
                  {poItems.map((item, idx) => {
                    const isActive = phase === 'processing' && items.indexOf(item) === currentIndex;
                    return (
                      <TableRow
                        key={`${poNumber}-${idx}`}
                        className={cn(
                          'text-sm transition-colors',
                          idx % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                          item.status === 'skipped' && 'opacity-50',
                          item.status === 'failed' && 'bg-destructive/5',
                          item.status === 'success' && 'bg-green-500/5',
                          isActive && 'bg-primary/10 ring-1 ring-primary/20',
                        )}
                      >
                        <TableCell className="text-center">
                          {getStatusIcon(item.status)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {item.order.asin && (
                              <div className="font-mono text-xs text-foreground">{item.order.asin}</div>
                            )}
                            {item.order.sku_code && (
                              <div className="font-mono text-xs text-muted-foreground">{item.order.sku_code}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-foreground line-clamp-2">
                            {item.order.title || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{item.pendingQty}</TableCell>
                        <TableCell className={cn(
                          "text-center font-semibold",
                          item.fulfillQty > 0 ? 'text-green-600' : 'text-muted-foreground'
                        )}>
                          {item.fulfillQty}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.stockBefore}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.stockAfter}</TableCell>
                        <TableCell className="text-center">
                          {item.error && (
                            <span className="text-[10px] text-destructive max-w-[80px] truncate block" title={item.error}>
                              {item.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20 print:hidden">
          {phase === 'preview' && (
            <>
              <div className="text-xs text-muted-foreground">
                {stats.actionable} items ready • {stats.skipped} skipped (insufficient stock)
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={startProcessing}
                  disabled={stats.actionable === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Start Fulfillment ({stats.actionable} items)
                </Button>
              </div>
            </>
          )}

          {phase === 'processing' && (
            <>
              <div className="text-xs text-muted-foreground">
                Processing... Do not close this dialog.
              </div>
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <Square className="h-3.5 w-3.5 mr-1.5" />
                Cancel Remaining
              </Button>
            </>
          )}

          {phase === 'summary' && (
            <>
              <div className="text-xs text-muted-foreground">
                Generated by <span className="font-semibold">HUHA Tools</span> • {format(completedTimestamp, 'PPpp')}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print Report
                </Button>
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Print styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            [role="dialog"], [role="dialog"] * { visibility: visible; }
            [role="dialog"] { position: absolute; left: 0; top: 0; width: 100%; }
            .print\\:hidden { display: none !important; }
            button[class*="DialogPrimitive"] { display: none !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
