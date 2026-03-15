import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Printer, Download, FileText, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface BulkFulfillResult {
  asin?: string;
  title?: string;
  sku_code?: string;
  po_number: string;
  requested_qty: number;
  fulfilled_qty: number;
  instock_before: number;
  instock_after: number;
  serial_numbers: string[];
  success: boolean;
  error?: string;
}

interface BulkFulfillSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: BulkFulfillResult[];
  timestamp: Date;
}

export const BulkFulfillSummary: React.FC<BulkFulfillSummaryProps> = ({
  open,
  onOpenChange,
  results,
  timestamp,
}) => {
  const stats = useMemo(() => {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      totalRequested: results.reduce((s, r) => s + r.requested_qty, 0),
      totalFulfilled: successful.reduce((s, r) => s + r.fulfilled_qty, 0),
    };
  }, [results]);

  // Group by PO number
  const groupedByPO = useMemo(() => {
    const map = new Map<string, BulkFulfillResult[]>();
    results.forEach(r => {
      if (!map.has(r.po_number)) map.set(r.po_number, []);
      map.get(r.po_number)!.push(r);
    });
    return Array.from(map.entries());
  }, [results]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['PO Number', 'ASIN', 'SKU', 'Title', 'Requested Qty', 'Fulfilled Qty', 'Stock Before', 'Stock After', 'Serial Numbers', 'Status', 'Error'];
    const rows = results.map(r => [
      r.po_number,
      r.asin || '',
      r.sku_code || '',
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.requested_qty,
      r.fulfilled_qty,
      r.instock_before,
      r.instock_after,
      `"${r.serial_numbers.join(', ')}"`,
      r.success ? 'Success' : 'Failed',
      r.error || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fulfillment-report-${format(timestamp, 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        <DialogHeader className="print:mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Fulfillment Summary Report
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format(timestamp, 'PPpp')}
          </div>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:grid-cols-5">
          <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground font-medium">Items Processed</div>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <div className="text-xs text-green-600/80 font-medium">Successful</div>
          </div>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <div className="text-xs text-destructive/80 font-medium">Failed</div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalRequested}</div>
            <div className="text-xs text-primary/80 font-medium">Requested Qty</div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalFulfilled}</div>
            <div className="text-xs text-blue-600/80 font-medium">Fulfilled Qty</div>
          </div>
        </div>

        {/* Grouped Table */}
        <div className="rounded-xl border border-border/30 overflow-hidden">
          {groupedByPO.map(([poNumber, items], groupIdx) => (
            <div key={poNumber}>
              {/* PO Group Header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border/20">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">PO: {poNumber}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <Table>
                {groupIdx === 0 && (
                  <TableHeader>
                    <TableRow className="bg-muted/20 text-xs">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="min-w-[120px]">ASIN / SKU</TableHead>
                      <TableHead className="min-w-[180px]">Title</TableHead>
                      <TableHead className="text-center w-20">Req.</TableHead>
                      <TableHead className="text-center w-20">Fulfilled</TableHead>
                      <TableHead className="text-center w-24">Stock Before</TableHead>
                      <TableHead className="text-center w-24">Stock After</TableHead>
                      <TableHead className="min-w-[120px]">Serial Numbers</TableHead>
                      <TableHead className="text-center w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                <TableBody>
                  {items.map((item, idx) => {
                    const globalIdx = results.indexOf(item);
                    return (
                      <TableRow
                        key={`${poNumber}-${idx}`}
                        className={`text-sm ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'} ${!item.success ? 'bg-destructive/5' : ''}`}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {globalIdx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {item.asin && (
                              <div className="font-mono text-xs text-foreground">{item.asin}</div>
                            )}
                            {item.sku_code && (
                              <div className="font-mono text-xs text-muted-foreground">{item.sku_code}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-foreground line-clamp-2">
                            {item.title || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{item.requested_qty}</TableCell>
                        <TableCell className="text-center font-semibold text-green-600">
                          {item.fulfilled_qty}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.instock_before}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.instock_after}</TableCell>
                        <TableCell>
                          <div className="text-xs font-mono text-muted-foreground max-w-[140px] truncate" title={item.serial_numbers.join(', ')}>
                            {item.serial_numbers.length > 0 ? item.serial_numbers.join(', ') : '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <XCircle className="h-4 w-4 text-destructive" />
                              {item.error && (
                                <span className="text-[10px] text-destructive max-w-[80px] truncate" title={item.error}>
                                  {item.error}
                                </span>
                              )}
                            </div>
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <div className="text-xs text-muted-foreground">
            Generated by <span className="font-semibold">HUHA Tools</span> • {format(timestamp, 'PPpp')}
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-primary hover:bg-primary/90">
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Report
            </Button>
          </div>
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
