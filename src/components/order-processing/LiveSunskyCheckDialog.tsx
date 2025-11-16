import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { useState } from 'react';

interface LiveSunskyCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: {
    totalChecked: number;
    foundInSunsky: number;
    notFoundInSunsky: number;
    apiErrors: number;
    matchDetails: Array<{
      orderId: string;
      sku: string;
      asin: string;
      status: 'found' | 'not_found' | 'error';
      sunskyData?: any;
      errorMessage?: string;
    }>;
  };
}

export function LiveSunskyCheckDialog({ open, onOpenChange, results }: LiveSunskyCheckDialogProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'found' | 'not_found' | 'error'>('all');

  const filteredDetails = filterStatus === 'all' 
    ? results.matchDetails 
    : results.matchDetails.filter(d => d.status === filterStatus);

  const exportToCSV = () => {
    const headers = ['Order ID', 'SKU', 'ASIN', 'Status', 'Sunsky Title', 'Price', 'Error'];
    const rows = results.matchDetails.map(d => [
      d.orderId,
      d.sku || '-',
      d.asin || '-',
      d.status,
      d.sunskyData?.title || '-',
      d.sunskyData?.price || '-',
      d.errorMessage || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunsky-check-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Live Sunsky Catalog Check Results</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="glass-card p-4 rounded-lg border border-border/40">
            <div className="text-sm text-muted-foreground mb-1">Total Checked</div>
            <div className="text-2xl font-bold text-foreground">{results.totalChecked}</div>
          </div>
          <div className="glass-card p-4 rounded-lg border border-border/40">
            <div className="text-sm text-muted-foreground mb-1">Found</div>
            <div className="text-2xl font-bold text-green-500">{results.foundInSunsky}</div>
          </div>
          <div className="glass-card p-4 rounded-lg border border-border/40">
            <div className="text-sm text-muted-foreground mb-1">Not Found</div>
            <div className="text-2xl font-bold text-red-500">{results.notFoundInSunsky}</div>
          </div>
          <div className="glass-card p-4 rounded-lg border border-border/40">
            <div className="text-sm text-muted-foreground mb-1">Errors</div>
            <div className="text-2xl font-bold text-yellow-500">{results.apiErrors}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items ({results.totalChecked})</SelectItem>
              <SelectItem value="found">Found Only ({results.foundInSunsky})</SelectItem>
              <SelectItem value="not_found">Not Found ({results.notFoundInSunsky})</SelectItem>
              <SelectItem value="error">Errors ({results.apiErrors})</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="flex-1 overflow-auto border border-border/40 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>ASIN</TableHead>
                <TableHead>Sunsky Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDetails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No items to display
                  </TableCell>
                </TableRow>
              ) : (
                filteredDetails.map((detail, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {detail.status === 'found' && (
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Found
                        </Badge>
                      )}
                      {detail.status === 'not_found' && (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Found
                        </Badge>
                      )}
                      {detail.status === 'error' && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{detail.orderId}</TableCell>
                    <TableCell className="font-mono text-xs">{detail.sku || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{detail.asin || '-'}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {detail.sunskyData?.title || '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {detail.sunskyData?.price ? `$${detail.sunskyData.price}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {detail.errorMessage || (detail.sunskyData?.availability || '-')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
