import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Search, ArrowUpDown, Download, ChevronLeft, ChevronRight, Star, Skull, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AsinHealth, HealthStatus } from '@/hooks/useAsinSalesHealth';

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  data: AsinHealth[];
  loading: boolean;
}

const STATUS_CONFIG: Record<HealthStatus, { label: string; icon: any; badgeClass: string }> = {
  star: { label: 'Star', icon: Star, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  growing: { label: 'Growing', icon: TrendingUp, badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  stable: { label: 'Stable', icon: Minus, badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  declining: { label: 'Declining', icon: TrendingDown, badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  low_mover: { label: 'Low Mover', icon: Zap, badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400' },
  dead: { label: 'Dead', icon: Skull, badgeClass: 'bg-gray-200 text-gray-500 dark:bg-gray-800/40 dark:text-gray-500' },
  new: { label: 'New', icon: Sparkles, badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as HealthStatus[];

const ROW_HIGHLIGHT: Record<HealthStatus, string> = {
  star: 'bg-emerald-50/40 dark:bg-emerald-950/10',
  growing: 'bg-green-50/50 dark:bg-green-950/10',
  declining: 'bg-orange-50/50 dark:bg-orange-950/10',
  at_risk: 'bg-red-50/30 dark:bg-red-950/10',
  stable: '',
  low_mover: '',
  dead: 'bg-muted/30',
  new: '',
};

const PAGE_SIZES = [25, 50, 100];

type SortKey = 'asin' | 'status' | 'velocity' | 'peak' | 'healthScore' | 'changePercent' | 'totalShipped' | 'gap';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : score >= 40
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>{score}</span>;
}

function TrendArrow({ slope }: { slope: number }) {
  if (slope > 0.3) return <span className="text-green-600 text-[10px] font-medium">▲ {slope.toFixed(1)}</span>;
  if (slope < -0.3) return <span className="text-orange-600 text-[10px] font-medium">▼ {slope.toFixed(1)}</span>;
  return <span className="text-muted-foreground text-[10px]">— {slope.toFixed(1)}</span>;
}

export function SalesHealthDashboard({ data, loading }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('healthScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [exportStatuses, setExportStatuses] = useState<Set<HealthStatus>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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

  const maxQty = useMemo(() => Math.max(...data.flatMap(d => d.monthlyData.map(m => m.qty)), 1), [data]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data.length };
    ALL_STATUSES.forEach(s => { counts[s] = data.filter(d => d.status === s).length; });
    return counts;
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => r.asin.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'asin') cmp = a.asin.localeCompare(b.asin);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'velocity') cmp = a.salesVelocity - b.salesVelocity;
      else if (sortKey === 'peak') cmp = a.peakMonthlyAvg - b.peakMonthlyAvg;
      else if (sortKey === 'healthScore') cmp = a.healthScore - b.healthScore;
      else if (sortKey === 'changePercent') cmp = a.changePercent - b.changePercent;
      else if (sortKey === 'totalShipped') cmp = a.totalShipped - b.totalShipped;
      else if (sortKey === 'gap') cmp = a.monthsSinceLastSale - b.monthsSinceLastSale;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [data, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

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
    const exportData = data.filter(item => statusesToExport.has(item.status));

    if (exportData.length === 0) {
      toast({ title: 'No data to export', description: 'No ASINs match the selected statuses.', variant: 'destructive' });
      return;
    }

    const monthHeaders = last12Months.map(m => `${MONTH_LABELS[m.month]} ${m.year}`);
    const headers = ['ASIN', 'SKU', 'Title', 'Status', 'Score', 'Velocity', 'Peak', 'Active', 'Gap', 'Trend', ...monthHeaders, 'Change %', 'Total Shipped', 'Last Active'];

    const rows = exportData.map(item => {
      const monthlyQtys = last12Months.map(m => getQty(item, m.year, m.month));
      return [
        item.asin,
        item.sku || '',
        `"${(item.title || '').replace(/"/g, '""')}"`,
        item.status,
        item.healthScore,
        item.salesVelocity,
        item.peakMonthlyAvg,
        `${item.monthsActive}/${item.totalMonths}`,
        item.monthsSinceLastSale,
        item.trendSlope,
        ...monthlyQtys,
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

  const showStart = (safePage - 1) * pageSize + 1;
  const showEnd = Math.min(safePage * pageSize, filtered.length);

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
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-7 h-8 text-xs w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label} ({statusCounts[k] || 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                <TableHead className="text-xs cursor-pointer sticky left-0 bg-background z-10" onClick={() => toggleSort('asin')}>
                  Product <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('status')}>
                  Status <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('healthScore')}>
                  Score <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('velocity')}>
                  Velocity <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('peak')}>
                  Peak <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-center">Active</TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('gap')}>
                  Gap <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-center">Trend</TableHead>
                <TableHead className="text-xs">Monthly Shipped (12mo)</TableHead>
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
              {paginatedData.map(item => {
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
                    <TableCell className="py-2 max-w-[220px] sticky left-0 bg-background z-10">
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
                    <TableCell className="text-right">
                      <ScoreBadge score={item.healthScore} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{item.salesVelocity.toFixed(1)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{item.peakMonthlyAvg.toFixed(1)}</TableCell>
                    <TableCell className="text-xs text-center font-mono">
                      <span className={item.monthsActive / item.totalMonths > 0.6 ? 'text-green-600' : item.monthsActive / item.totalMonths < 0.3 ? 'text-red-600' : 'text-foreground'}>
                        {item.monthsActive}/{item.totalMonths}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      <span className={item.monthsSinceLastSale === 0 ? 'text-green-600' : item.monthsSinceLastSale >= 3 ? 'text-red-600' : 'text-orange-600'}>
                        {item.monthsSinceLastSale}mo
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <TrendArrow slope={item.trendSlope} />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-6 gap-x-0 gap-y-0 min-w-[240px]">
                          {last12Months.map((m, i) => {
                            const qty = getQty(item, m.year, m.month);
                            const isQuarterEnd = (i + 1) % 3 === 0 && i < last12Months.length - 1;
                            return (
                              <div
                                key={`${m.year}-${m.month}`}
                                className={`flex flex-col items-center px-1 py-0.5 ${isQuarterEnd ? 'border-r border-border' : ''}`}
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
                              : item.status === 'star' ? 'bg-emerald-500'
                              : item.status === 'growing' ? 'bg-green-500'
                              : item.status === 'declining' ? 'bg-orange-500'
                              : item.status === 'at_risk' ? 'bg-red-500'
                              : item.status === 'dead' || item.status === 'low_mover' ? 'bg-muted-foreground'
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

        {/* Pagination Footer */}
        <div className="p-3 border-t flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length > 0 ? showStart : 0}–{showEnd} of {filtered.length} ASINs
            {filtered.length !== data.length && ` (filtered from ${data.length})`}
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[60px] text-center">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
