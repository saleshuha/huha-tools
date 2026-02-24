import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
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
  Download,
  RefreshCw,
  PackageCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
  serial_number: string | null;
  picked_from_bin: boolean;
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
  const [sortField, setSortField] = useState<'processed_at' | 'order_number' | 'serial_number' | 'quantity_processed' | 'new_stock'>('processed_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRecord, setSelectedRecord] = useState<ProcessedOrderRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'asin' | 'sku'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedDate(new Date());
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

  const togglePickedFromBin = async (recordId: string, currentValue: boolean) => {
    const newValue = !currentValue;
    
    // Optimistic update
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, picked_from_bin: newValue } : r));
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(prev => prev ? { ...prev, picked_from_bin: newValue } : prev);
    }

    const { error } = await supabase
      .from('processed_orders')
      .update({ picked_from_bin: newValue } as any)
      .eq('id', recordId);

    if (error) {
      // Revert on error
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, picked_from_bin: currentValue } : r));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(prev => prev ? { ...prev, picked_from_bin: currentValue } : prev);
      }
      toast({ title: 'Error', description: 'Failed to update picked status', variant: 'destructive' });
    }
  };

  // Get unique dates from records
  const availableDates = useMemo(() => {
    const dateMap = new Map<string, { date: Date; count: number }>();
    records.forEach(r => {
      const d = startOfDay(new Date(r.processed_at));
      const key = d.toISOString();
      if (dateMap.has(key)) {
        dateMap.get(key)!.count++;
      } else {
        dateMap.set(key, { date: d, count: 1 });
      }
    });
    return Array.from(dateMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [records]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const filtered = records
    .filter(r => {
      if (!isSameDay(new Date(r.processed_at), selectedDate)) return false;
      if (filterType !== 'all' && r.inventory_type !== filterType) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.order_number.toLowerCase().includes(q) ||
        (r.asin?.toLowerCase().includes(q)) ||
        (r.sku?.toLowerCase().includes(q)) ||
        (r.item_title?.toLowerCase().includes(q)) ||
        (r.serial_number?.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortField === 'quantity_processed' || sortField === 'new_stock') {
        const aVal = sortField === 'quantity_processed' ? a.quantity_processed : (a.new_stock ?? 0);
        const bVal = sortField === 'quantity_processed' ? b.quantity_processed : (b.new_stock ?? 0);
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      return sortDir === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });

  const totalDeducted = filtered.reduce((sum, r) => sum + r.quantity_processed, 0);
  const uniqueOrders = new Set(filtered.map(r => r.order_number)).size;
  const uniqueProducts = new Set(filtered.map(r => r.asin || r.sku).filter(Boolean)).size;
  const pickedCount = filtered.filter(r => r.picked_from_bin).length;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />;
  };

  const exportCSV = () => {
    const headers = ['Order Number', 'ASIN', 'SKU', 'Serial Number', 'Title', 'Qty Processed', 'Previous Stock', 'New Stock', 'Picked From Bin', 'Inventory Type', 'Match Type', 'Source File', 'Processed At'];
    const rows = filtered.map(r => [
      r.order_number, r.asin || '', r.sku || '', r.serial_number || '',
      r.item_title || '', r.quantity_processed, r.previous_stock ?? '', r.new_stock ?? '',
      r.picked_from_bin ? 'Yes' : 'No',
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
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="w-4 h-4 text-primary" />
            Processing History
          </DialogTitle>
        </DialogHeader>

        {/* Compact stats bar */}
        <div className="px-5 flex items-center gap-3 text-xs flex-wrap">
          <Badge variant="secondary" className="gap-1 font-normal">
            <Hash className="w-3 h-3" />
            {uniqueOrders} orders
          </Badge>
          <Badge variant="secondary" className="gap-1 font-normal">
            <Package className="w-3 h-3" />
            {uniqueProducts} products
          </Badge>
          <Badge variant="secondary" className="gap-1 font-normal">
            <TrendingDown className="w-3 h-3" />
            {totalDeducted} deducted
          </Badge>
          <Badge variant="secondary" className="gap-1 font-normal">
            <PackageCheck className="w-3 h-3" />
            {pickedCount}/{filtered.length} picked
          </Badge>
        </div>

        {/* Date chips row */}
        <div className="px-5 pt-2">
          <ScrollArea className="w-full">
            <div className="flex items-center gap-1.5 pb-1">
              {availableDates.map(({ date, count }) => (
                <Button
                  key={date.toISOString()}
                  variant={isSameDay(date, selectedDate) ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs shrink-0 gap-1"
                  onClick={() => setSelectedDate(date)}
                >
                  {getDateLabel(date)}
                  <span className="text-[10px] opacity-70">({count})</span>
                </Button>
              ))}
              {availableDates.length === 0 && !loading && (
                <span className="text-xs text-muted-foreground">No history yet</span>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Toolbar */}
        <div className="px-5 pt-2 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search order, ASIN, SKU, serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'asin', 'sku'] as const).map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs capitalize px-2"
                onClick={() => setFilterType(type)}
              >
                {type === 'all' ? 'All' : type.toUpperCase()}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={exportCSV}>
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={loadHistory} disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Separator className="mt-2" />

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Table */}
          <ScrollArea className={`flex-1 ${selectedRecord ? 'border-r' : ''}`}>
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b bg-muted/40">
                  <th className="text-center p-2 font-medium w-10">
                    <PackageCheck className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                  </th>
                  <th
                    className="text-left p-2 font-medium cursor-pointer hover:text-primary"
                    onClick={() => toggleSort('order_number')}
                  >
                    <span className="flex items-center gap-1">Order <SortIcon field="order_number" /></span>
                  </th>
                  <th className="text-left p-2 font-medium">ASIN / SKU</th>
                  <th className="text-left p-2 font-medium cursor-pointer hover:text-primary" onClick={() => toggleSort('serial_number')}>
                    <span className="flex items-center gap-1">Serial # <SortIcon field="serial_number" /></span>
                  </th>
                  <th className="text-center p-2 font-medium cursor-pointer hover:text-primary" onClick={() => toggleSort('quantity_processed')}>
                    <span className="flex items-center justify-center gap-1">Qty <SortIcon field="quantity_processed" /></span>
                  </th>
                  <th className="text-center p-2 font-medium cursor-pointer hover:text-primary" onClick={() => toggleSort('new_stock')}>
                    <span className="flex items-center justify-center gap-1">Stock <SortIcon field="new_stock" /></span>
                  </th>
                  <th className="text-center p-2 font-medium">Type</th>
                  <th
                    className="text-left p-2 font-medium cursor-pointer hover:text-primary"
                    onClick={() => toggleSort('processed_at')}
                  >
                    <span className="flex items-center gap-1">Time <SortIcon field="processed_at" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">
                      {loading ? 'Loading...' : `No records for ${getDateLabel(selectedDate)}.`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((record, idx) => (
                    <tr
                      key={record.id}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${
                        selectedRecord?.id === record.id
                          ? 'bg-primary/5'
                          : idx % 2 === 0
                          ? 'hover:bg-muted/30'
                          : 'bg-muted/10 hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={record.picked_from_bin}
                          onCheckedChange={() => togglePickedFromBin(record.id, record.picked_from_bin)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className={`p-2 font-mono ${record.picked_from_bin ? 'line-through opacity-50' : ''}`}>
                        {record.order_number}
                      </td>
                      <td className="p-2 font-mono">
                        {record.asin || record.sku || '—'}
                      </td>
                      <td className="p-2">
                        {record.serial_number ? (
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                            {record.serial_number}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2 text-center font-medium">{record.quantity_processed}</td>
                      <td className="p-2 text-center">
                        <span className="text-muted-foreground">{record.previous_stock ?? '?'}</span>
                        <span className="mx-0.5 text-muted-foreground">→</span>
                        <span className={record.new_stock === 0 ? 'text-destructive font-medium' : ''}>
                          {record.new_stock ?? '?'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {record.inventory_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {format(new Date(record.processed_at), 'HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>

          {/* Detail panel */}
          {selectedRecord && (
            <div className="w-[260px] p-3 overflow-y-auto bg-muted/10">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold">Details</h4>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setSelectedRecord(null)}>
                    ✕
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {/* Picked status */}
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
                    <Checkbox
                      checked={selectedRecord.picked_from_bin}
                      onCheckedChange={() => togglePickedFromBin(selectedRecord.id, selectedRecord.picked_from_bin)}
                      className="h-4 w-4"
                    />
                    <div className="flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">
                        {selectedRecord.picked_from_bin ? 'Picked from bin' : 'Not picked yet'}
                      </span>
                    </div>
                  </div>

                  <DetailRow icon={<Hash className="w-3 h-3" />} label="Order" value={selectedRecord.order_number} />
                  {selectedRecord.asin && (
                    <DetailRow icon={<Package className="w-3 h-3" />} label="ASIN" value={selectedRecord.asin} />
                  )}
                  {selectedRecord.sku && (
                    <DetailRow icon={<Box className="w-3 h-3" />} label="SKU" value={selectedRecord.sku} />
                  )}
                  {selectedRecord.serial_number && (
                    <DetailRow icon={<Hash className="w-3 h-3" />} label="Serial #" value={selectedRecord.serial_number} mono />
                  )}
                  {selectedRecord.item_title && (
                    <DetailRow icon={<FileText className="w-3 h-3" />} label="Title" value={selectedRecord.item_title} />
                  )}

                  <Separator />

                  <DetailRow label="Qty Processed" value={String(selectedRecord.quantity_processed)} />
                  <DetailRow label="Stock Before" value={String(selectedRecord.previous_stock ?? '—')} />
                  <DetailRow label="Stock After" value={String(selectedRecord.new_stock ?? '—')} highlight={selectedRecord.new_stock === 0} />

                  <Separator />

                  <DetailRow label="Inventory Type" value={selectedRecord.inventory_type.toUpperCase()} />
                  <DetailRow label="Match Type" value={selectedRecord.match_type.toUpperCase()} />
                  {selectedRecord.inventory_id && (
                    <DetailRow label="Inventory ID" value={selectedRecord.inventory_id} mono />
                  )}
                  {selectedRecord.source_file && (
                    <DetailRow icon={<FileText className="w-3 h-3" />} label="Source File" value={selectedRecord.source_file} />
                  )}

                  <Separator />

                  <DetailRow
                    icon={<Calendar className="w-3 h-3" />}
                    label="Processed At"
                    value={format(new Date(selectedRecord.processed_at), 'MMM d, yyyy HH:mm:ss')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} records for {getDateLabel(selectedDate)} · {pickedCount} picked · {records.length} total
          </p>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
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
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-xs break-all ${mono ? 'font-mono' : ''} ${highlight ? 'text-destructive font-medium' : ''}`}>
        {value}
      </p>
    </div>
  );
}
