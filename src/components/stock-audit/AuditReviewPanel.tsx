import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { CheckCircle2, XCircle, AlertTriangle, Download, Search, TrendingDown, TrendingUp } from 'lucide-react';
import type { AuditScan, AsinGroup } from '@/hooks/useStockAudit';

interface AuditReviewPanelProps {
  verifiedAsins: AsinGroup[];
  fullyVerified: AsinGroup[];
  partiallyScanned: AsinGroup[];
  missingAsins: AsinGroup[];
  unmatchedScans: AuditScan[];
  totalSystemAsins: number;
}

export function AuditReviewPanel({
  verifiedAsins,
  fullyVerified,
  partiallyScanned,
  missingAsins,
  unmatchedScans,
  totalSystemAsins,
}: AuditReviewPanelProps) {
  const [search, setSearch] = useState('');

  const filterGroups = (groups: AsinGroup[]) => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups.filter(g =>
      g.asin.toLowerCase().includes(q) ||
      (g.title?.toLowerCase().includes(q)) ||
      (g.sku?.toLowerCase().includes(q))
    );
  };

  const filteredVerified = useMemo(() => filterGroups(verifiedAsins), [verifiedAsins, search]);
  const filteredMissing = useMemo(() => filterGroups(missingAsins), [missingAsins, search]);
  const filteredPartial = useMemo(() => filterGroups(partiallyScanned), [partiallyScanned, search]);

  const exportMissingCSV = () => {
    const headers = ['ASIN', 'SKU', 'Title', 'System Qty', 'Scanned Qty', 'Difference'];
    const rows = [...missingAsins, ...partiallyScanned].map(g => [
      g.asin, g.sku || '', g.title || '', g.systemQty, g.scannedQty, g.scannedQty - g.systemQty,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-discrepancies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const AsinTable = ({ items, emptyMsg, showDiff = false }: { items: AsinGroup[]; emptyMsg: string; showDiff?: boolean }) => (
    items.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground text-sm">{emptyMsg}</div>
    ) : (
      <div className="max-h-[500px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ASIN</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">System</TableHead>
              <TableHead className="text-right">Scanned</TableHead>
              {showDiff && <TableHead className="text-right">Diff</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(group => {
              const diff = group.scannedQty - group.systemQty;
              return (
                <TableRow key={group.asin}>
                  <TableCell className="font-mono text-xs">{group.asin}</TableCell>
                  <TableCell className="text-xs">{group.sku || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[250px] truncate">{group.title || '-'}</TableCell>
                  <TableCell className="text-right">{group.systemQty}</TableCell>
                  <TableCell className="text-right font-medium">{group.scannedQty}</TableCell>
                  {showDiff && (
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                        diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {diff > 0 && <TrendingUp className="h-3 w-3" />}
                        {diff < 0 && <TrendingDown className="h-3 w-3" />}
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
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
                placeholder="Search ASIN, SKU, or title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-[220px] h-9"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-bold text-emerald-600">{fullyVerified.length}</div>
            <div className="text-xs text-muted-foreground">Fully Verified</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-lg font-bold text-amber-600">{partiallyScanned.length}</div>
            <div className="text-xs text-muted-foreground">Partial</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="text-lg font-bold text-rose-600">{missingAsins.length}</div>
            <div className="text-xs text-muted-foreground">Not Scanned</div>
          </div>
        </div>

        <Tabs defaultValue="verified">
          <TabsList className="mb-3">
            <TabsTrigger value="verified" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Scanned ({verifiedAsins.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              Missing ({missingAsins.length + partiallyScanned.length})
            </TabsTrigger>
            <TabsTrigger value="unmatched" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Unmatched ({unmatchedScans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verified">
            <AsinTable items={filteredVerified} emptyMsg="No verified ASINs yet" showDiff />
          </TabsContent>

          <TabsContent value="missing">
            <div className="mb-3 flex justify-end">
              <Button
                size="sm" variant="outline" onClick={exportMissingCSV}
                disabled={missingAsins.length === 0 && partiallyScanned.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
            {filteredPartial.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Partially Scanned
                </h4>
                <AsinTable items={filteredPartial} emptyMsg="" showDiff />
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                Not Scanned at All
              </h4>
              <AsinTable items={filteredMissing} emptyMsg="Everything is accounted for!" showDiff />
            </div>
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
