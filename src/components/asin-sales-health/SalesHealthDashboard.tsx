import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Search, ArrowUpDown, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AsinHealth, HealthStatus } from '@/hooks/useAsinSalesHealth';

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  data: AsinHealth[];
  loading: boolean;
}

const STATUS_CONFIG: Record<HealthStatus, { label: string; icon: any; badgeClass: string }> = {
  growing: { label: 'Growing', icon: TrendingUp, badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  stable: { label: 'Stable', icon: Minus, badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  declining: { label: 'Declining', icon: TrendingDown, badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  inactive: { label: 'Inactive', icon: AlertTriangle, badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  new: { label: 'New', icon: Sparkles, badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as HealthStatus[];

const ROW_HIGHLIGHT: Record<HealthStatus, string> = {
  growing: 'bg-green-50/50 dark:bg-green-950/10',
  declining: 'bg-orange-50/50 dark:bg-orange-950/10',
  inactive: 'bg-red-50/30 dark:bg-red-950/10',
  stable: '',
  new: '',
};

type SortKey = 'asin' | 'status' | 'recentQty' | 'priorQty' | 'changePercent' | 'totalShipped';

export function SalesHealthDashboard({ data, loading }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [exportStatuses, setExportStatuses] = useState<Set<HealthStatus>>(new Set());
  const { toast } = useToast();

  const last12Months = useMemo(() => {
    const allMonths = new Set<string>();
    data.forEach(d => d.monthlyData.forEach(m => allMonths.add(`${m.year}-${m.month}`)));
    const sorted = Array.from(allMonths)
      .map(k => { const [y, m] = k.split('-').map(Number); return { year: y, month: m, num: y * 12 + m }; })
      .sort((a, b) => a.num - b.num);
    return sorted.slice(-12);
  }, [data]);

  const getQty = (item: AsinHealth, year: number, month: number) => {
    const found = item.monthlyData.find(m => m.year === year && m.month === month);
    return found ? found.qty : 0;
  };

  const getRecentPrior = (item: AsinHealth) => {
    const recent3 = last12Months.slice(-3);
    const prior3 = last12Months.slice(-6, -3);
    const recentQty = recent3.reduce((s, m) => s + getQty(item, m.year, m.month), 0);
    const priorQty = prior3.reduce((s, m) => s + getQty(item, m.year, m.month), 0);
    return { recentQty, priorQty };
  };

  const maxQty = useMemo(() => Math.max(...data.flatMap(d => d.monthlyData.map(m => m.qty)), 1), [data]);

  const filtered = useMemo(() => {
    let result = data.map(item => ({ ...item, ...getRecentPrior(item) }));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => r.asin.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'asin') cmp = a.asin.localeCompare(b.asin);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'recentQty') cmp = a.recentQty - b.recentQty;
      else if (sortKey === 'priorQty') cmp = a.priorQty - b.priorQty;
      else if (sortKey === 'changePercent') cmp = a.changePercent - b.changePercent;
      else if (sortKey === 'totalShipped') cmp = a.totalShipped - b.totalShipped;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [data, search, statusFilter, sortKey, sortDir, last12Months]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleExportStatus = (status: HealthStatus) => {
    setExportStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const handleExport = useCallback(() => {
    const statusesToExport = exportStatuses.size > 0 ? exportStatuses : new Set(ALL_STATUSES);
    const exportData = data
      .map(item => ({ ...item, ...getRecentPrior(item) }))
      .filter(item => statusesToExport.has(item.status));

    if (exportData.length === 0) {
      toast({ title: 'No data to export', description: 'No ASINs match the selected statuses.', variant: 'destructive' });
      return;
    }

    const monthHeaders = last12Months.map(m => `${MONTH_LABELS[m.month]} ${m.year}`);
    const headers = ['ASIN', 'SKU', 'Title', 'Status', ...monthHeaders, 'Prior 3mo', 'Recent 3mo', 'Change %', 'Total Shipped', 'Last Active'];

    const rows = exportData.map(item => {
      const monthlyQtys = last12Months.map(m => getQty(item, m.year, m.month));
      return [
        item.asin,
        item.sku || '',
        `"${(item.title || '').replace(/"/g, '""')}"`,
        item.status,
        ...monthlyQtys,
        item.priorQty,
        item.recentQty,
        `${item.changePercent.toFixed(1)}%`,
        item.totalShipped,
        item.lastActiveMonth,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const statusLabel = exportStatuses.size > 0 ? Array.from(exportStatuses).join('_') : 'all';
    a.download = `asin_health_${statusLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export complete', description: `Exported ${exportData.length} ASINs (${statusLabel}).` });
  }, [data, exportStatuses, last12Months, toast]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading health data...</div>;
  }

  if (data.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="p-8 text-center text-muted-foreground">
          No sales data uploaded yet. Upload monthly data to see health analysis.
        </CardContent>
      </Card>
    );
  }

  const exportCount = exportStatuses.size > 0
    ? data.filter(d => exportStatuses.has(d.status)).length
    : data.length;

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm">ASIN Health Analysis</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search ASIN, SKU, title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 h-8 text-xs w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-foreground">Export by Status</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={exportStatuses.size === ALL_STATUSES.length}
                        onCheckedChange={() => {
                          setExportStatuses(prev =>
                            prev.size === ALL_STATUSES.length ? new Set() : new Set(ALL_STATUSES)
                          );
                        }}
                      />
                      <span className="text-xs font-medium">Select All</span>
                    </label>
                    <div className="border-t border-border pt-2 space-y-1.5">
                      {ALL_STATUSES.map(status => {
                        const cfg = STATUS_CONFIG[status];
                        const Icon = cfg.icon;
                        const count = data.filter(d => d.status === status).length;
                        return (
                          <label key={status} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={exportStatuses.has(status)}
                              onCheckedChange={() => toggleExportStatus(status)}
                            />
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="text-xs flex-1">{cfg.label}</span>
                            <span className="text-[10px] text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={handleExport}>
                    <Download className="h-3 w-3" />
                    Export {exportCount} ASINs
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('asin')}>
                  Product <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('status')}>
                  Status <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs">Monthly Shipped (12mo)</TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('priorQty')}>
                  Prior 3mo <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('recentQty')}>
                  Recent 3mo <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('changePercent')}>
                  Δ% <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('totalShipped')}>
                  Total <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const cfg = STATUS_CONFIG[item.status];
                const Icon = cfg.icon;
                const rowHighlight = ROW_HIGHLIGHT[item.status] || '';
                const deltaClass = item.changePercent > 20
                  ? 'bg-green-100/60 dark:bg-green-900/20'
                  : item.changePercent < -20
                    ? 'bg-orange-100/60 dark:bg-orange-900/20'
                    : '';

                return (
                  <TableRow key={item.asin} className={rowHighlight}>
                    <TableCell className="py-2 max-w-[220px]">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-foreground">{item.asin}</span>
                          {item.sku && (
                            <span className="text-[10px] text-muted-foreground">· {item.sku}</span>
                          )}
                        </div>
                        {item.title && (
                          <span className="text-[10px] text-muted-foreground truncate leading-tight">{item.title}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] gap-1 ${cfg.badgeClass}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-6 gap-x-0 gap-y-0 min-w-[240px]">
                          {last12Months.map((m, i) => {
                            const qty = getQty(item, m.year, m.month);
                            const isRecent = i >= last12Months.length - 3;
                            const isQuarterEnd = (i + 1) % 3 === 0 && i < last12Months.length - 1;
                            return (
                              <div
                                key={`${m.year}-${m.month}`}
                                className={`flex flex-col items-center px-1 py-0.5 ${isRecent ? 'bg-primary/5 rounded' : ''} ${isQuarterEnd ? 'border-r border-border' : ''}`}
                              >
                                <span className="text-[9px] text-muted-foreground leading-none">{MONTH_LABELS[m.month]}</span>
                                <span className={`text-[10px] font-mono leading-tight ${qty === 0 ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>{qty}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-end gap-[2px] h-4 min-w-[240px] px-0.5">
                          {last12Months.map((m) => {
                            const qty = getQty(item, m.year, m.month);
                            const h = Math.max(1, (qty / maxQty) * 16);
                            const barColor = qty === 0
                              ? 'bg-muted'
                              : item.status === 'growing' ? 'bg-green-500'
                              : item.status === 'declining' ? 'bg-orange-500'
                              : item.status === 'inactive' ? 'bg-destructive'
                              : 'bg-primary';
                            return (
                              <div
                                key={`bar-${m.year}-${m.month}`}
                                className={`flex-1 rounded-t ${barColor}`}
                                style={{ height: `${h}px` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{item.priorQty}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">{item.recentQty}</TableCell>
                    <TableCell className={`text-xs text-right font-medium rounded ${deltaClass} ${item.changePercent > 0 ? 'text-green-600' : item.changePercent < 0 ? 'text-orange-600' : ''}`}>
                      {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-xs text-right">{item.totalShipped.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{item.lastActiveMonth}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t text-xs text-muted-foreground">
          Showing {filtered.length} of {data.length} ASINs
        </div>
      </CardContent>
    </Card>
  );
}
