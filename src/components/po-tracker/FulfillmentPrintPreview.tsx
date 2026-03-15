import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Printer, Download, Truck, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
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

type SortField = 'fulfilledQty' | 'pendingQty' | 'serialNumber' | 'inStock' | 'status' | null;
type SortDir = 'asc' | 'desc';

type FulfillmentStatus = 'Fully Fulfilled' | 'Partially Fulfilled' | 'Not Fulfilled';

interface FulfillmentPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: POOrder[];
  findInventoryMatch: (asin: string, sunskySku?: string, poSku?: string, modelNumber?: string, orderSunskySku?: any) => InventoryMatch | null;
}

export function FulfillmentPrintPreview({ open, onOpenChange, orders, findInventoryMatch }: FulfillmentPrintPreviewProps) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const enrichedOrders = useMemo(() => orders.map(order => {
    const match = findInventoryMatch(order.asin || '', order.sunsky_sku?.sku_code, order.sku_code, order.model_number, order.sunsky_sku);
    const inStockQty = match?.quantity || 0;

    let serialNumbers: string[] = [];
    if (match?.serialNumbers) {
      serialNumbers = match.serialNumbers;
    } else if (match?.serialNumber) {
      serialNumbers = [match.serialNumber];
    } else if (match?.inventoryItem?.serial_number) {
      serialNumbers = [match.inventoryItem.serial_number];
    }

    const poQty = order.quantity || 0;

    // Extract fulfilled quantity from notes
    let fulfilledQty = 0;
    if (order.notes) {
      const fulfilledMatch = order.notes.match(/Fulfilled from stock:\s*(\d+)/i);
      if (fulfilledMatch) {
        fulfilledQty = parseInt(fulfilledMatch[1], 10);
      }
    }
    // Also use _totalFulfilledFromStock if available (consolidated orders)
    if (order._totalFulfilledFromStock && order._totalFulfilledFromStock > fulfilledQty) {
      fulfilledQty = order._totalFulfilledFromStock;
    }

    const pendingQty = Math.max(0, poQty - fulfilledQty);

    let fulfillmentStatus: FulfillmentStatus = 'Not Fulfilled';
    if (fulfilledQty >= poQty && poQty > 0) fulfillmentStatus = 'Fully Fulfilled';
    else if (fulfilledQty > 0) fulfillmentStatus = 'Partially Fulfilled';

    return {
      ...order,
      _inStockQty: inStockQty,
      _serialNumbers: serialNumbers,
      _poQty: poQty,
      _fulfilledQty: fulfilledQty,
      _pendingQty: pendingQty,
      _fulfillmentStatus: fulfillmentStatus,
    };
  }), [orders, findInventoryMatch]);

  const sortedOrders = useMemo(() => {
    if (!sortField) return enrichedOrders;
    const statusRank = (s: FulfillmentStatus) => s === 'Fully Fulfilled' ? 2 : s === 'Partially Fulfilled' ? 1 : 0;
    const sorted = [...enrichedOrders].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'fulfilledQty': cmp = a._fulfilledQty - b._fulfilledQty; break;
        case 'pendingQty': cmp = a._pendingQty - b._pendingQty; break;
        case 'inStock': cmp = a._inStockQty - b._inStockQty; break;
        case 'status': cmp = statusRank(a._fulfillmentStatus) - statusRank(b._fulfillmentStatus); break;
        case 'serialNumber': {
          const aS = a._serialNumbers[0] || '';
          const bS = b._serialNumbers[0] || '';
          if (aS && !bS) return -1;
          if (!aS && bS) return 1;
          cmp = aS.localeCompare(bS);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [enrichedOrders, sortField, sortDir]);

  const totals = enrichedOrders.reduce((acc, o) => ({
    items: acc.items + 1,
    poQty: acc.poQty + o._poQty,
    fulfilledQty: acc.fulfilledQty + o._fulfilledQty,
    pendingQty: acc.pendingQty + o._pendingQty,
    inStockQty: acc.inStockQty + o._inStockQty,
    fullyFulfilled: acc.fullyFulfilled + (o._fulfillmentStatus === 'Fully Fulfilled' ? 1 : 0),
    partiallyFulfilled: acc.partiallyFulfilled + (o._fulfillmentStatus === 'Partially Fulfilled' ? 1 : 0),
    notFulfilled: acc.notFulfilled + (o._fulfillmentStatus === 'Not Fulfilled' ? 1 : 0),
  }), { items: 0, poQty: 0, fulfilledQty: 0, pendingQty: 0, inStockQty: 0, fullyFulfilled: 0, partiallyFulfilled: 0, notFulfilled: 0 });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortField(null); setSortDir('desc'); }
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'desc'
      ? <ArrowDown className="h-3 w-3 text-primary" />
      : <ArrowUp className="h-3 w-3 text-primary" />;
  };

  const handlePrint = () => {
    const rows = sortedOrders.map((order, idx) => {
      const poNumbers = order._isConsolidated && order._consolidatedOrders
        ? [...new Set(order._consolidatedOrders.map((o: any) => o.po_number))].join(', ')
        : order.po_number || '';
      const serials = order._serialNumbers.join(' | ') || '—';
      const bgColor = idx % 2 === 0 ? '#fff' : '#f0f0f0';
      return `<tr style="border-bottom:1.5px solid #000;background:${bgColor}">
        <td style="text-align:center">${idx + 1}</td>
        <td><div>${order.asin || '—'}</div>${order.sku_code || order.model_number ? `<div style="font-size:7pt;color:#666">${order.sku_code || order.model_number}</div>` : ''}</td>
        <td style="white-space:normal;word-break:break-word">${order.title || '—'}</td>
        <td>${poNumbers}</td>
        <td style="text-align:center;font-weight:600">${order._poQty}</td>
        <td style="text-align:center;font-weight:600;color:${order._pendingQty > 0 ? '#dc2626' : '#16a34a'}">${order._pendingQty}</td>
        <td style="text-align:center">${order._inStockQty}</td>
        <td style="font-size:7pt">${serials}</td>
        <td style="text-align:center;font-weight:600;color:${order._fulfilledQty > 0 ? '#16a34a' : '#999'}">${order._fulfilledQty}</td>
        <td style="text-align:center;font-size:7pt">${order._fulfillmentStatus}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Fulfillment Report</title><style>
      @page { size: landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; font-size: 8pt; margin: 0; padding: 0; color: #000; }
      table { width: 100%; border-collapse: collapse; table-layout: auto; }
      th, td { padding: 3px 5px; border: 1px solid #333; font-size: 8pt; white-space: nowrap; }
      th { background: #e8e8e8; font-weight: bold; }
      tfoot td { background: #e0e0e0; font-weight: bold; }
      .footer-note { margin-top: 6px; font-size: 7pt; color: #666; text-align: right; }
    </style></head><body>
      <table>
        <thead><tr>
          <th>#</th><th>ASIN / SKU</th><th>Title</th><th>PO Number</th>
          <th>PO Qty</th><th>Pending</th><th>In-Stock</th><th>Serial #</th>
          <th>Fulfilled</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="4" style="text-align:right">Totals (${totals.items} items)</td>
          <td style="text-align:center">${totals.poQty}</td>
          <td style="text-align:center;color:#dc2626">${totals.pendingQty}</td>
          <td style="text-align:center">${totals.inStockQty}</td>
          <td></td>
          <td style="text-align:center;color:#16a34a">${totals.fulfilledQty}</td>
          <td></td>
        </tr></tfoot>
      </table>
      <div class="footer-note">Generated: ${new Date().toLocaleString()}</div>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); printWindow.close(); };
    }
  };

  const handleExportCSV = () => {
    const headers = ['#', 'ASIN', 'SKU', 'Title', 'PO Number', 'PO Qty', 'Fulfilled Qty', 'Pending Qty', 'Serial Number(s)', 'In-Stock Qty', 'Fulfillment Status'];
    const rows = sortedOrders.map((o, i) => [
      i + 1, o.asin || '', o.sku_code || o.model_number || '',
      (o.title || '').replace(/,/g, ' '), o.po_number || '',
      o._poQty, o._fulfilledQty, o._pendingQty,
      o._serialNumbers.join(' | '), o._inStockQty, o._fulfillmentStatus,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fulfillment-preview-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s: FulfillmentStatus) => {
    if (s === 'Fully Fulfilled') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (s === 'Partially Fulfilled') return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
  };

  const StatusIcon = ({ status }: { status: FulfillmentStatus }) => {
    if (status === 'Fully Fulfilled') return <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />;
    if (status === 'Partially Fulfilled') return <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />;
    return <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />;
  };

  const SortableHead = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={`${className} cursor-pointer select-none hover:bg-muted/80 transition-colors`} onClick={() => toggleSort(field)}>
      <div className="flex items-center justify-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col fulfillment-print-dialog">
        <DialogHeader className="flex-shrink-0 print-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Fulfillment Preview</DialogTitle>
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

          {/* Summary Stats Bar */}
          <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-border/40">
            <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5">
              📦 Total: <span className="font-bold">{totals.items}</span>
            </Badge>
            <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
              <CheckCircle2 className="h-3 w-3" /> Fully Fulfilled: <span className="font-bold">{totals.fullyFulfilled}</span>
            </Badge>
            <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
              <AlertTriangle className="h-3 w-3" /> Partial: <span className="font-bold">{totals.partiallyFulfilled}</span>
            </Badge>
            <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1.5 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
              <XCircle className="h-3 w-3" /> Not Fulfilled: <span className="font-bold">{totals.notFulfilled}</span>
            </Badge>
            <div className="ml-auto text-xs text-muted-foreground font-mono">
              Fulfilled: {totals.fulfilledQty} / {totals.poQty} units
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 border border-border/40 rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="min-w-[140px]">ASIN / SKU</TableHead>
                <TableHead className="min-w-[180px]">Title</TableHead>
                <TableHead className="min-w-[100px]">PO Number</TableHead>
                <TableHead className="text-center w-[70px]">PO Qty</TableHead>
                <SortableHead field="pendingQty" className="text-center w-[70px]">Pending</SortableHead>
                <SortableHead field="inStock" className="text-center w-[80px]">In-Stock</SortableHead>
                <SortableHead field="serialNumber" className="min-w-[140px]">Serial #</SortableHead>
                <SortableHead field="fulfilledQty" className="text-center w-[80px]">Fulfilled</SortableHead>
                <SortableHead field="status" className="text-center w-[120px]">Status</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order, idx) => (
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
                    <span className="text-xs font-mono font-semibold">{order._poQty}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-mono font-semibold ${order._pendingQty > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {order._pendingQty}
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
                    <span className={`text-xs font-mono font-semibold ${order._fulfilledQty > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {order._fulfilledQty}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${statusBadge(order._fulfillmentStatus)}`}>
                      <StatusIcon status={order._fulfillmentStatus} />
                      {order._fulfillmentStatus}
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
                <TableCell className="text-center text-xs font-mono">{totals.poQty}</TableCell>
                <TableCell className="text-center text-xs font-mono font-bold text-destructive">{totals.pendingQty}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs font-mono bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                    {totals.inStockQty}
                  </Badge>
                </TableCell>
                <TableCell />
                <TableCell className="text-center text-xs font-mono text-green-600 dark:text-green-400">{totals.fulfilledQty}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

      </DialogContent>
    </Dialog>
  );
}
