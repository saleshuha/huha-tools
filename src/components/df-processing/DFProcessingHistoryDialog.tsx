import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  History,
  Search,
  Package,
  Calendar,
  ArrowDown,
  ArrowUp,
  FileText,
  Hash,
  Box,
  TrendingDown,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProcessedOrderRecord {
  id: string;
  order_number: string;
  asin: string | null;
  sku: string | null;
  item_title: string | null;
  inventory_type: string;
  match_type: string;
  quantity_processed: number;
  previous_stock: number | null;
  new_stock: number | null;
  inventory_id: string | null;
  source_file: string | null;
  notes: string | null;
  processed_at: string;
  created_at: string;
}

interface DFProcessingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DFProcessingHistoryDialog({ open, onOpenChange }: DFProcessingHistoryDialogProps) {
  const [records, setRecords] = useState<ProcessedOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'processed_at' | 'order_number'>('processed_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRecord, setSelectedRecord] = useState<ProcessedOrderRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'asin' | 'sku'>('all');

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('processed_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('processed_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setRecords(data as ProcessedOrderRecord[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = records
    .filter(r => {
      if (filterType !== 'all' && r.inventory_type !== filterType) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.order_number.toLowerCase().includes(q) ||
        (r.asin?.toLowerCase().includes(q)) ||
        (r.sku?.toLowerCase().includes(q)) ||
        (r.item_title?.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aVal = sortField === 'processed_at' ? a.processed_at : a.order_number;
      const bVal = sortField === 'processed_at' ? b.processed_at : b.order_number;
      return sortDir === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });

  const totalDeducted = filtered.reduce((sum, r) => sum + r.quantity_processed, 0);
  const uniqueOrders = new Set(filtered.map(r => r.order_number)).size;
  const uniqueProducts = new Set(filtered.map(r => r.asin || r.sku).filter(Boolean)).size;

  const toggleSort = (field: 'processed_at' | 'order_number') => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'processed_at' | 'order_number' }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  };

  const exportCSV = () => {
    const headers = ['Order Number', 'ASIN', 'SKU', 'Title', 'Qty Processed', 'Previous Stock', 'New Stock', 'Inventory Type', 'Match Type', 'Source File', 'Processed At'];
    const rows = filtered.map(r => [
      r.order_number, r.asin || '', r.sku || '', r.item_title || '',
      r.quantity_processed, r.previous_stock ?? '', r.new_stock ?? '',
      r.inventory_type, r.match_type, r.source_file || '',
      format(new Date(r.processed_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processing-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            Processing History
          </DialogTitle>
        </DialogHeader>

        {/* Stats bar */}
        <div className="px-6 grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-sm font-semibold">{uniqueOrders}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Package className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-sm font-semibold">{uniqueProducts}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Deducted</p>
              <p className="text-sm font-semibold">{totalDeducted} units</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 pt-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search order, ASIN, SKU, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {(['all', 'asin', 'sku'] as const).map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs capitalize"
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'All' : type.toUpperCase()}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={loadHistory} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <Separator className="mt-3" />

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Table */}
          <ScrollArea className={`flex-1 ${selectedRecord ? 'border-r' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b bg-muted/50">
                  <th
                    className="text-left p-2.5 font-medium text-xs cursor-pointer hover:text-primary"
                    onClick={() => toggleSort('order_number')}
                  >
                    <span className="flex items-center gap-1">Order <SortIcon field="order_number" /></span>
                  </th>
                  <th className="text-left p-2.5 font-medium text-xs">ASIN / SKU</th>
                  <th className="text-left p-2.5 font-medium text-xs hidden lg:table-cell">Title</th>
                  <th className="text-center p-2.5 font-medium text-xs">Qty</th>
                  <th className="text-center p-2.5 font-medium text-xs">Stock Change</th>
                  <th className="text-center p-2.5 font-medium text-xs">Type</th>
                  <th
                    className="text-left p-2.5 font-medium text-xs cursor-pointer hover:text-primary"
                    onClick={() => toggleSort('processed_at')}
                  >
                    <span className="flex items-center gap-1">Date <SortIcon field="processed_at" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {loading ? 'Loading...' : 'No processing history found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr
                      key={record.id}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${
                        selectedRecord?.id === record.id ? 'bg-primary/5' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="p-2.5 font-mono text-xs">{record.order_number}</td>
                      <td className="p-2.5 font-mono text-xs">
                        {record.asin || record.sku || '—'}
                      </td>
                      <td className="p-2.5 text-xs max-w-[150px] truncate hidden lg:table-cell">
                        {record.item_title || '—'}
                      </td>
                      <td className="p-2.5 text-center text-xs font-medium">{record.quantity_processed}</td>
                      <td className="p-2.5 text-center text-xs">
                        <span className="text-muted-foreground">{record.previous_stock ?? '?'}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className={record.new_stock === 0 ? 'text-destructive font-medium' : ''}>
                          {record.new_stock ?? '?'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {record.inventory_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(record.processed_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>

          {/* Detail panel */}
          {selectedRecord && (
            <div className="w-[280px] p-4 overflow-y-auto bg-muted/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Order Details</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedRecord(null)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-3">
                  <DetailRow icon={<Hash className="w-3.5 h-3.5" />} label="Order Number" value={selectedRecord.order_number} />
                  {selectedRecord.asin && (
                    <DetailRow icon={<Package className="w-3.5 h-3.5" />} label="ASIN" value={selectedRecord.asin} />
                  )}
                  {selectedRecord.sku && (
                    <DetailRow icon={<Box className="w-3.5 h-3.5" />} label="SKU" value={selectedRecord.sku} />
                  )}
                  {selectedRecord.item_title && (
                    <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Title" value={selectedRecord.item_title} />
                  )}

                  <Separator />

                  <DetailRow label="Quantity Processed" value={String(selectedRecord.quantity_processed)} />
                  <DetailRow label="Stock Before" value={String(selectedRecord.previous_stock ?? '—')} />
                  <DetailRow label="Stock After" value={String(selectedRecord.new_stock ?? '—')} highlight={selectedRecord.new_stock === 0} />

                  <Separator />

                  <DetailRow label="Inventory Type" value={selectedRecord.inventory_type.toUpperCase()} />
                  <DetailRow label="Match Type" value={selectedRecord.match_type.toUpperCase()} />
                  {selectedRecord.inventory_id && (
                    <DetailRow label="Inventory ID" value={selectedRecord.inventory_id} mono />
                  )}
                  {selectedRecord.source_file && (
                    <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Source File" value={selectedRecord.source_file} />
                  )}
                  {selectedRecord.notes && (
                    <DetailRow label="Notes" value={selectedRecord.notes} />
                  )}

                  <Separator />

                  <DetailRow
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Processed At"
                    value={format(new Date(selectedRecord.processed_at), 'MMM d, yyyy HH:mm:ss')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {records.length} records
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-xs break-all ${mono ? 'font-mono' : ''} ${highlight ? 'text-destructive font-medium' : ''}`}>
        {value}
      </p>
    </div>
  );
}
