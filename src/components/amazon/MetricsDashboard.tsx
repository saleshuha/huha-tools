import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Package, Clock, AlertTriangle, Calendar, CreditCard, TrendingUp, Target, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { DashboardMetrics } from '@/types/amazon-fulfillment';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCurrencyDisplay } from '@/components/amazon/CurrencySelector';
import { useCountry } from '@/contexts/CountryContext';
import { useMemo, useState } from 'react';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface MetricsDashboardProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  orders?: any[];
}

export const MetricsDashboard = ({ metrics, loading, orders }: MetricsDashboardProps) => {
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { displayCurrency } = useCurrencyDisplay();
  const { selectedCountry } = useCountry();
  const { creditDays } = usePaymentTerms();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Converted values
  const convertedTotalValue = useMemo(() => {
    if (!metrics?.totalValue) return 0;
    return convertCurrency(parseFloat(metrics.totalValue?.toString()) || 0, 'USD', displayCurrency);
  }, [metrics?.totalValue, displayCurrency, convertCurrency]);

  const convertedPaidValue = useMemo(() => {
    if (!metrics?.paidValue) return 0;
    return convertCurrency(parseFloat(metrics.paidValue?.toString()) || 0, 'USD', displayCurrency);
  }, [metrics?.paidValue, displayCurrency, convertCurrency]);

  const convertedPendingValue = useMemo(() => {
    if (!metrics?.pendingValue) return 0;
    return convertCurrency(parseFloat(metrics.pendingValue?.toString()) || 0, 'USD', displayCurrency);
  }, [metrics?.pendingValue, displayCurrency, convertCurrency]);

  const convertedOverdueValue = useMemo(() => {
    if (!metrics?.overdueValue) return 0;
    return convertCurrency(parseFloat(metrics.overdueValue?.toString()) || 0, 'USD', displayCurrency);
  }, [metrics?.overdueValue, displayCurrency, convertCurrency]);

  // Collection rate & avg days
  const { collectionRate, avgDaysToPay } = useMemo(() => {
    if (!orders || orders.length === 0) return { collectionRate: 0, avgDaysToPay: 0 };
    let totalVal = 0, paidVal = 0, totalDays = 0, paidCount = 0;
    orders.forEach(order => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const val = convertCurrency(cost * qty, order.currency || 'USD', displayCurrency);
      totalVal += val;
      const ps = (order.payment_status || '').toLowerCase().trim();
      const st = (order.status || '').toLowerCase().trim();
      if (ps === 'completed' || st === 'paid') {
        paidVal += val;
        if (order.shipment_date && order.payment_completed_date) {
          const days = Math.max(0, Math.floor((new Date(order.payment_completed_date).getTime() - new Date(order.shipment_date).getTime()) / 86400000));
          totalDays += days;
          paidCount++;
        }
      }
    });
    return {
      collectionRate: totalVal > 0 ? (paidVal / totalVal) * 100 : 0,
      avgDaysToPay: paidCount > 0 ? Math.round(totalDays / paidCount) : 0,
    };
  }, [orders, convertCurrency, displayCurrency]);

  // Payment aging buckets
  const agingBuckets = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    const buckets = [
      { label: '0–30d', min: 0, max: 30, count: 0, value: 0 },
      { label: '30–60d', min: 30, max: 60, count: 0, value: 0 },
      { label: '60–90d', min: 60, max: 90, count: 0, value: 0 },
      { label: '90d+', min: 90, max: Infinity, count: 0, value: 0 },
    ];
    orders.filter(o => {
      const s = (o.status || '').toLowerCase().trim();
      const p = (o.payment_status || '').toLowerCase().trim();
      return (s === 'approved' || s === 'non-submitted') && p !== 'completed';
    }).forEach(order => {
      if (!order.shipment_date) return;
      const dueDate = new Date(order.shipment_date);
      dueDate.setDate(dueDate.getDate() + creditDays);
      const daysOver = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const val = convertCurrency(cost * qty, order.currency || 'USD', displayCurrency);
      for (const b of buckets) {
        if (daysOver >= b.min && daysOver < b.max) { b.count++; b.value += val; break; }
      }
    });
    return buckets;
  }, [orders, convertCurrency, displayCurrency, creditDays]);

  // Status values
  const statusValues = useMemo(() => {
    if (!metrics?.statusBreakdown || !orders) return {};
    const values: Record<string, number> = {};
    Object.keys(metrics.statusBreakdown).forEach(status => {
      const val = orders.filter(o => o.status === status).reduce((sum, o) => {
        const cost = parseFloat(o.item_cost?.toString() || '0') || 0;
        const qty = parseInt(o.quantity?.toString() || '1') || 1;
        return sum + convertCurrency(cost * qty, o.currency || 'USD', displayCurrency);
      }, 0);
      values[status] = val;
    });
    return values;
  }, [metrics?.statusBreakdown, orders, convertCurrency, displayCurrency]);

  // Upcoming payment values
  const upcomingValues = useMemo(() => {
    if (!orders) return { next7Days: 0, next30Days: 0, next90Days: 0 };
    const now = new Date();
    const calcUpcoming = (days: number) => {
      const end = new Date(now.getTime() + days * 86400000);
      return orders.filter(o => {
        const s = (o.status || '').toLowerCase().trim();
        if (s !== 'approved' && s !== 'non-submitted') return false;
        if (!o.shipment_date) return false;
        const due = new Date(o.shipment_date);
        due.setDate(due.getDate() + creditDays);
        return due > now && due <= end;
      }).reduce((sum, o) => {
        const cost = parseFloat(o.item_cost?.toString() || '0') || 0;
        const qty = parseInt(o.quantity?.toString() || '1') || 1;
        return sum + convertCurrency(cost * qty, o.currency || 'USD', displayCurrency);
      }, 0);
    };
    return { next7Days: calcUpcoming(7), next30Days: calcUpcoming(30), next90Days: calcUpcoming(90) };
  }, [orders, convertCurrency, displayCurrency, creditDays]);

  // Monthly trend
  const monthlyTrendData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const monthly = new Map<string, { totalUnits: number; totalAmount: number; unpaidAmount: number }>();
    const getKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const getLabel = (k: string) => {
      const [y, m] = k.split('-');
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };
    orders.forEach(order => {
      if (!order.shipment_date) return;
      const key = getKey(new Date(order.shipment_date));
      if (!monthly.has(key)) monthly.set(key, { totalUnits: 0, totalAmount: 0, unpaidAmount: 0 });
      const d = monthly.get(key)!;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      d.totalUnits += qty;
      d.totalAmount += convertCurrency(cost * qty, order.currency || 'USD', displayCurrency);
    });
    orders.forEach(order => {
      if (!order.shipment_date) return;
      const ps = (order.payment_status || '').toLowerCase().trim();
      const st = (order.status || '').toLowerCase().trim();
      if (ps === 'completed' || st === 'paid') return;
      const due = new Date(order.shipment_date);
      due.setDate(due.getDate() + creditDays);
      const key = getKey(due);
      if (!monthly.has(key)) monthly.set(key, { totalUnits: 0, totalAmount: 0, unpaidAmount: 0 });
      const d = monthly.get(key)!;
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      d.unpaidAmount += convertCurrency(cost * qty, order.currency || 'USD', displayCurrency);
    });
    return Array.from(monthly.entries()).map(([k, d]) => ({ month: getLabel(k), monthKey: k, ...d }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey)).slice(-12);
  }, [orders, displayCurrency, convertCurrency, creditDays]);

  // Date range payment details
  const dateRangeDetails = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !orders) return null;
    const now = new Date();
    const filter = (predicate: (o: any) => boolean) => orders.filter(o => {
      if (!o.shipment_date) return false;
      const due = new Date(o.shipment_date);
      due.setDate(due.getDate() + creditDays);
      if (due < dateRange.from! || due > dateRange.to!) return false;
      return predicate(o);
    });
    const sumVal = (list: any[]) => list.reduce((s, o) => {
      const cost = parseFloat(o.item_cost?.toString() || '0') || 0;
      const qty = parseInt(o.quantity?.toString() || '1') || 1;
      return s + convertCurrency(cost * qty, o.currency || 'USD', displayCurrency);
    }, 0);
    const overdue = filter(o => {
      const s = (o.status || '').toLowerCase().trim();
      if (s !== 'approved' && s !== 'non-submitted') return false;
      const due = new Date(o.shipment_date);
      due.setDate(due.getDate() + creditDays);
      return due < now;
    });
    const pending = filter(o => {
      const s = (o.status || '').toLowerCase().trim();
      if (s !== 'approved' && s !== 'non-submitted') return false;
      const due = new Date(o.shipment_date);
      due.setDate(due.getDate() + creditDays);
      return due >= now;
    });
    const paid = filter(o => {
      const ps = (o.payment_status || '').toLowerCase().trim();
      const st = (o.status || '').toLowerCase().trim();
      return ps === 'completed' || st === 'paid';
    });
    return {
      overdue: { count: overdue.length, value: sumVal(overdue) },
      pending: { count: pending.length, value: sumVal(pending) },
      paid: { count: paid.length, value: sumVal(paid) },
    };
  }, [dateRange, orders, convertCurrency, displayCurrency, creditDays]);

  // Pie chart data for status
  const pieData = useMemo(() => {
    if (!metrics?.statusBreakdown) return [];
    const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];
    return Object.entries(metrics.statusBreakdown).map(([name, value], i) => ({
      name, value, fill: colors[i % colors.length]
    }));
  }, [metrics?.statusBreakdown]);

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!metrics) return null;

  const metricCards = [
    { label: 'Total Orders', count: metrics.totalOrders, value: convertedTotalValue, icon: Package, color: 'primary' as const, sub: 'All fulfillment orders' },
    { label: 'Paid', count: metrics.paidPayments, value: convertedPaidValue, icon: CreditCard, color: 'success' as const, sub: 'Completed payments' },
    { label: 'Pending', count: metrics.pendingPayments, value: convertedPendingValue, icon: Clock, color: 'warning' as const, sub: 'Awaiting payment' },
    { label: 'Overdue', count: metrics.overduePayments, value: convertedOverdueValue, icon: AlertTriangle, color: 'destructive' as const, sub: `Past ${creditDays}-day terms` },
  ];

  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-4">
      {/* Top Metric Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {metricCards.map(({ label, count, value, icon: Icon, color, sub }) => (
          <Card key={label} className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <div className={`p-1.5 rounded-md ${colorMap[color]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{count.toLocaleString()}</div>
              <div className="text-sm font-semibold text-foreground/80 tabular-nums">
                {formatCurrency(value, displayCurrency)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Row: Collection Rate, Avg Days, Aging */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Collection Rate</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{collectionRate.toFixed(1)}%</div>
            <Progress value={collectionRate} className="mt-2 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {formatCurrency(convertedPaidValue, displayCurrency)} of {formatCurrency(convertedTotalValue, displayCurrency)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Avg Days to Payment</span>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">{avgDaysToPay || '—'}</div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {avgDaysToPay > 0
                ? avgDaysToPay > creditDays
                  ? <span className="text-destructive">{avgDaysToPay - creditDays}d over terms</span>
                  : <span className="text-success">{creditDays - avgDaysToPay}d under terms</span>
                : 'No completed payments'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground">Payment Aging</span>
            </div>
            <div className="space-y-1.5">
              {agingBuckets.map((b, i) => {
                const maxVal = Math.max(...agingBuckets.map(x => x.value), 1);
                const colors = ['bg-success', 'bg-warning', 'bg-primary', 'bg-destructive'];
                return (
                  <div key={b.label} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-muted-foreground shrink-0">{b.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[i]} transition-all`} style={{ width: `${(b.value / maxVal) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-medium tabular-nums">{b.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Monthly Performance</CardTitle>
            </div>
            {monthlyTrendData.length > 0 && (
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground">Units</p>
                  <p className="text-sm font-bold tabular-nums">{monthlyTrendData.reduce((s, m) => s + m.totalUnits, 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Amount</p>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(monthlyTrendData.reduce((s, m) => s + m.totalAmount, 0), displayCurrency)}</p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {monthlyTrendData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No monthly data available</div>
          ) : (
            <ChartContainer config={{
              totalUnits: { label: "Units", color: "hsl(var(--primary))" },
              totalAmount: { label: "Amount", color: "hsl(var(--chart-2))" },
              unpaidAmount: { label: "Unpaid", color: "hsl(var(--chart-3))" },
            }} className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="amtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="unpaidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2.5 shadow-lg text-xs">
                        <div className="font-semibold mb-1.5">{d.month}</div>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Units</span>
                            <span className="font-medium tabular-nums">{d.totalUnits?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium tabular-nums">{formatCurrency(d.totalAmount, displayCurrency)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Unpaid</span>
                            <span className="font-medium tabular-nums">{formatCurrency(d.unpaidAmount, displayCurrency)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }} />
                  <Bar yAxisId="right" dataKey="totalUnits" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.8} />
                  <Area yAxisId="left" type="monotone" dataKey="totalAmount" fill="url(#amtGrad)" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="unpaidAmount" fill="url(#unpaidGrad)" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Bottom Grid: Status + Upcoming + Date Range */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        {/* Status Breakdown */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.statusBreakdown).map(([status, count]) => {
                const pct = metrics.totalOrders > 0 ? (count / metrics.totalOrders) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs w-24 truncate text-muted-foreground">{status}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-right min-w-[60px]">
                      <span className="text-xs font-medium tabular-nums">{count}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({formatCurrency(statusValues[status] || 0, displayCurrency)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Next 7 days', count: metrics.upcomingPayments.next7Days, value: upcomingValues.next7Days, urgent: true },
                { label: 'Next 30 days', count: metrics.upcomingPayments.next30Days, value: upcomingValues.next30Days, urgent: false },
                { label: 'Next 90 days', count: metrics.upcomingPayments.next90Days, value: upcomingValues.next90Days, urgent: false },
              ].map(({ label, count, value, urgent }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {urgent && count > 0 ? <ArrowUpRight className="h-3 w-3 text-destructive" /> : <ArrowDownRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant={urgent && count > 0 ? 'destructive' : 'outline'} className="text-[10px] px-1.5 h-5">
                      {count}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {formatCurrency(value, displayCurrency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date Range Lookup */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Date Range Lookup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full mb-3" />
            {dateRangeDetails ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-md bg-destructive/10">
                  <div className="text-lg font-bold text-destructive tabular-nums">{dateRangeDetails.overdue.count}</div>
                  <div className="text-[10px] text-muted-foreground">Overdue</div>
                  <div className="text-[9px] text-muted-foreground tabular-nums">{formatCurrency(dateRangeDetails.overdue.value, displayCurrency)}</div>
                </div>
                <div className="text-center p-2 rounded-md bg-warning/10">
                  <div className="text-lg font-bold text-warning tabular-nums">{dateRangeDetails.pending.count}</div>
                  <div className="text-[10px] text-muted-foreground">Pending</div>
                  <div className="text-[9px] text-muted-foreground tabular-nums">{formatCurrency(dateRangeDetails.pending.value, displayCurrency)}</div>
                </div>
                <div className="text-center p-2 rounded-md bg-success/10">
                  <div className="text-lg font-bold text-success tabular-nums">{dateRangeDetails.paid.count}</div>
                  <div className="text-[10px] text-muted-foreground">Paid</div>
                  <div className="text-[9px] text-muted-foreground tabular-nums">{formatCurrency(dateRangeDetails.paid.value, displayCurrency)}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Select dates to view details</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
