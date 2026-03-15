import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Search, ArrowUpDown } from 'lucide-react';
import { AsinTrendChart } from './AsinTrendChart';
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

type SortKey = 'asin' | 'status' | 'recentAvg' | 'changePercent' | 'totalShipped';

export function SalesHealthDashboard({ data, loading }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const maxQty = useMemo(() => Math.max(...data.flatMap(d => d.monthlyData.map(m => m.qty)), 1), [data]);

  const filtered = useMemo(() => {
    let result = data;
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
      else if (sortKey === 'recentAvg') cmp = a.recentAvg - b.recentAvg;
      else if (sortKey === 'changePercent') cmp = a.changePercent - b.changePercent;
      else if (sortKey === 'totalShipped') cmp = a.totalShipped - b.totalShipped;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [data, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

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
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('asin')}>
                  ASIN <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('status')}>
                  Status <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs">Trend (12mo)</TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('recentAvg')}>
                  Avg (3mo) <ArrowUpDown className="h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('changePercent')}>
                  Change % <ArrowUpDown className="h-3 w-3 inline" />
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
                return (
                  <TableRow key={item.asin}>
                    <TableCell className="text-xs font-mono">{item.asin}</TableCell>
                    <TableCell className="text-xs">{item.sku || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{item.title || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] gap-1 ${cfg.badgeClass}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell><AsinTrendChart data={item} maxQty={maxQty} /></TableCell>
                    <TableCell className="text-xs text-right">{item.recentAvg.toFixed(0)}</TableCell>
                    <TableCell className={`text-xs text-right font-medium ${item.changePercent > 0 ? 'text-green-600' : item.changePercent < 0 ? 'text-orange-600' : ''}`}>
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
