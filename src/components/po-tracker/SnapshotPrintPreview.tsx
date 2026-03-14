import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Printer, Download, X, Lock, Package, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { POOrder } from '@/components/POTracker';

interface InventoryMatch {
  type: string;
  status: string;
  quantity: number;
  identifier?: string;
  serialNumbers?: string[] | null;
  serialNumber?: string;
  inventoryItem?: any;
  inventoryItems?: any[];
}

interface ActiveFilter {
  label: string;
  value: string;
}

interface SnapshotPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: POOrder[];
  findInventoryMatch: (asin: string, sunskySku?: string, poSku?: string, modelNumber?: string, orderSunskySku?: any) => InventoryMatch | null;
  activeFilters: ActiveFilter[];
}

export function SnapshotPrintPreview({ open, onOpenChange, orders, findInventoryMatch, activeFilters }: SnapshotPrintPreviewProps) {
  
  const enrichedOrders = orders.map(order => {
    const match = findInventoryMatch(order.asin || '', order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
    const inStockQty = match?.quantity || 0;
    
    // Collect serial numbers from different match types
    let serialNumbers: string[] = [];
    if (match?.serialNumbers) {
      serialNumbers = match.serialNumbers;
    } else if (match?.serialNumber) {
      serialNumbers = [match.serialNumber];
    } else if (match?.inventoryItem?.serial_number) {
      serialNumbers = [match.inventoryItem.serial_number];
    }
    
    const poQty = order.quantity || 0;
    const printedQty = order.printed_quantity || 0;
    const pendingQty = Math.max(0, poQty - printedQty);
    
    let status: 'Printed' | 'Partial' | 'Pending' = 'Pending';
    if (printedQty >= poQty) status = 'Printed';
    else if (printedQty > 0) status = 'Partial';
    
    return {
      ...order,
      _inStockQty: inStockQty,
      _serialNumbers: serialNumbers,
      _poQty: poQty,
      _printedQty: printedQty,
      _pendingQty: pendingQty,
      _status: status,
    };
  });

  const totals = enrichedOrders.reduce((acc, o) => ({
    items: acc.items + 1,
    poQty: acc.poQty + o._poQty,
    printedQty: acc.printedQty + o._printedQty,
    pendingQty: acc.pendingQty + o._pendingQty,
    inStockQty: acc.inStockQty + o._inStockQty,
  }), { items: 0, poQty: 0, printedQty: 0, pendingQty: 0, inStockQty: 0 });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['#', 'ASIN', 'SKU', 'Title', 'PO Number', 'In-Stock Qty', 'Serial Number(s)', 'PO Qty', 'Printed Qty', 'Pending Qty', 'Status'];
    const rows = enrichedOrders.map((o, i) => [
      i + 1,
      o.asin || '',
      o.sku_code || o.model_number || '',
      (o.title || '').replace(/,/g, ' '),
      o.po_number || '',
      o._inStockQty,
      o._serialNumbers.join(' | '),
      o._poQty,
      o._printedQty,
      o._pendingQty,
      o._status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-preview-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) => {
    if (s === 'Printed') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (s === 'Partial') return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col print-preview-dialog">
        <DialogHeader className="flex-shrink-0 print-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Snapshot Print Preview</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totals.items} items · Generated {new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="rounded-lg">
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
              <Button size="sm" onClick={handlePrint} className="rounded-lg">
                <Printer className="h-4 w-4 mr-1.5" />
                Print
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border/40">
              <span className="text-xs font-medium text-muted-foreground">Active Filters:</span>
              {activeFilters.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">
                  {f.label}: {f.value}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto mt-4 border border-border/40 rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="min-w-[140px]">ASIN / SKU</TableHead>
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="min-w-[100px]">PO Number</TableHead>
                <TableHead className="text-center w-[80px]">In-Stock</TableHead>
                <TableHead className="min-w-[140px]">Serial Number(s)</TableHead>
                <TableHead className="text-center w-[70px]">PO Qty</TableHead>
                <TableHead className="text-center w-[70px]">Printed</TableHead>
                <TableHead className="text-center w-[70px]">Pending</TableHead>
                <TableHead className="text-center w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedOrders.map((order, idx) => (
                <TableRow key={order.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <TableCell className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-medium">{order.asin || '—'}</div>
                      {(order.sku_code || order.model_number) && (
                        <div className="text-[10px] text-muted-foreground font-mono">{order.sku_code || order.model_number}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs line-clamp-2">{order.title || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono">
                      {order._isConsolidated && order._consolidatedOrders
                        ? [...new Set(order._consolidatedOrders.map(o => o.po_number))].join(', ')
                        : order.po_number}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs font-mono ${order._inStockQty > 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : 'bg-muted/50 text-muted-foreground'}`}>
                      {order._inStockQty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order._serialNumbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {order._serialNumbers.slice(0, 3).map((sn, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-accent/30">
                            {sn}
                          </Badge>
                        ))}
                        {order._serialNumbers.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">
                            +{order._serialNumbers.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-mono font-semibold">{order._poQty}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-mono">{order._printedQty}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-mono font-semibold ${order._pendingQty > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {order._pendingQty}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-[10px] ${statusColor(order._status)}`}>
                      {order._status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="sticky bottom-0 bg-muted/95 backdrop-blur-sm">
              <TableRow className="font-semibold">
                <TableCell colSpan={4} className="text-right text-xs">
                  Totals ({totals.items} items)
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs font-mono bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                    {totals.inStockQty}
                  </Badge>
                </TableCell>
                <TableCell />
                <TableCell className="text-center text-xs font-mono">{totals.poQty}</TableCell>
                <TableCell className="text-center text-xs font-mono">{totals.printedQty}</TableCell>
                <TableCell className="text-center text-xs font-mono font-bold text-red-600 dark:text-red-400">{totals.pendingQty}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .print-preview-dialog,
            .print-preview-dialog * { visibility: visible !important; }
            .print-preview-dialog { 
              position: fixed !important; 
              top: 0 !important; 
              left: 0 !important; 
              width: 100% !important; 
              max-width: 100% !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              padding: 10mm !important;
            }
            .no-print { display: none !important; }
            table { font-size: 9pt !important; }
            th, td { padding: 4px 6px !important; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
