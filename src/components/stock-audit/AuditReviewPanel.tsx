import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertTriangle, Download, Search } from 'lucide-react';
import type { AuditScan, InventoryItem } from '@/hooks/useStockAudit';

interface AuditReviewPanelProps {
  verifiedItems: InventoryItem[];
  missingItems: InventoryItem[];
  unmatchedScans: AuditScan[];
  totalSystemItems: number;
}

export function AuditReviewPanel({
  verifiedItems,
  missingItems,
  unmatchedScans,
  totalSystemItems,
}: AuditReviewPanelProps) {
  const [search, setSearch] = useState('');

  const filterItems = (items: InventoryItem[]) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.serial_number.toLowerCase().includes(q) ||
      i.asin.toLowerCase().includes(q) ||
      (i.title?.toLowerCase().includes(q)) ||
      (i.sku?.toLowerCase().includes(q))
    );
  };

  const filteredVerified = useMemo(() => filterItems(verifiedItems), [verifiedItems, search]);
  const filteredMissing = useMemo(() => filterItems(missingItems), [missingItems, search]);

  const exportMissingCSV = () => {
    const headers = ['Serial Number', 'ASIN', 'SKU', 'Title', 'Quantity'];
    const rows = missingItems.map(i => [
      i.serial_number, i.asin, i.sku || '', i.title || '', i.quantity
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-items-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ItemsTable = ({ items, emptyMsg }: { items: InventoryItem[]; emptyMsg: string }) => (
    items.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground text-sm">{emptyMsg}</div>
    ) : (
      <div className="max-h-[500px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial Number</TableHead>
              <TableHead>ASIN</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.serial_number}</TableCell>
                <TableCell className="text-xs">{item.asin}</TableCell>
                <TableCell className="text-xs">{item.sku || '-'}</TableCell>
                <TableCell className="text-xs max-w-[300px] truncate">{item.title || '-'}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Audit Review</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-[200px] h-9"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="verified">
          <TabsList className="mb-3">
            <TabsTrigger value="verified" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Scanned ({verifiedItems.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              Missing ({missingItems.length})
            </TabsTrigger>
            <TabsTrigger value="unmatched" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Unmatched ({unmatchedScans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verified">
            <ItemsTable items={filteredVerified} emptyMsg="No verified items yet" />
          </TabsContent>

          <TabsContent value="missing">
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={exportMissingCSV} disabled={missingItems.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
            <ItemsTable items={filteredMissing} emptyMsg="No missing items — everything is accounted for!" />
          </TabsContent>

          <TabsContent value="unmatched">
            {unmatchedScans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No unmatched scans</div>
            ) : (
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Scanned At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedScans.map(scan => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-mono text-xs">{scan.scanned_barcode}</TableCell>
                        <TableCell className="text-xs">{new Date(scan.scanned_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
