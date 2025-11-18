import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, Clock, CheckCircle, AlertTriangle, Calendar, CreditCard, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
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
export const MetricsDashboard = ({
  metrics,
  loading,
  orders
}: MetricsDashboardProps) => {
  const {
    formatCurrency,
    convertCurrency
  } = useCurrencyConverter();
  const {
    displayCurrency
  } = useCurrencyDisplay();
  const {
    selectedCountry
  } = useCountry();
  const {
    creditDays
  } = usePaymentTerms();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current 4 weeks, positive = future, negative = past
  const [upcomingWeeksOffset, setUpcomingWeeksOffset] = useState(0); // Separate offset for upcoming payments
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Force re-render when display currency or metrics change by creating a unique key
  const renderKey = `${displayCurrency}-${metrics?.totalValue || 0}`;

  // All hooks must be called before any early returns
  const convertedTotalValue = useMemo(() => {
    if (!metrics?.totalValue) return 0;
    const totalValue = parseFloat(metrics.totalValue?.toString()) || 0;
    const converted = convertCurrency(totalValue, 'USD', displayCurrency);
    console.log(`Dashboard Converting Total ${totalValue} USD to ${displayCurrency}: ${converted}`);
    return converted;
  }, [metrics?.totalValue, displayCurrency, convertCurrency]);

  // Calculate converted values for paid amounts
  const convertedPaidValue = useMemo(() => {
    if (!metrics?.paidValue) return 0;
    const paidValue = parseFloat(metrics.paidValue?.toString()) || 0;
    const converted = convertCurrency(paidValue, 'USD', displayCurrency);
    console.log(`Dashboard Converting Paid ${paidValue} USD to ${displayCurrency}: ${converted}`);
    return converted;
  }, [metrics?.paidValue, displayCurrency, convertCurrency]);

  // Calculate converted values for pending and overdue amounts
  const convertedPendingValue = useMemo(() => {
    if (!metrics?.pendingValue) return 0;
    const pendingValue = parseFloat(metrics.pendingValue?.toString()) || 0;
    const converted = convertCurrency(pendingValue, 'USD', displayCurrency);
    console.log(`Dashboard Converting Pending ${pendingValue} USD to ${displayCurrency}: ${converted}`);
    return converted;
  }, [metrics?.pendingValue, displayCurrency, convertCurrency]);
  const convertedOverdueValue = useMemo(() => {
    if (!metrics?.overdueValue) return 0;
    const overdueValue = parseFloat(metrics.overdueValue?.toString()) || 0;
    const converted = convertCurrency(overdueValue, 'USD', displayCurrency);
    console.log(`Dashboard Converting Overdue ${overdueValue} USD to ${displayCurrency}: ${converted}`);
    return converted;
  }, [metrics?.overdueValue, displayCurrency, convertCurrency]);

  // Calculate values for status breakdown (convert to USD then to display currency)
  const statusValues = useMemo(() => {
    if (!metrics?.statusBreakdown || !orders) return {};
    const values: {
      [key: string]: number;
    } = {};
    Object.keys(metrics.statusBreakdown).forEach(status => {
      const ordersWithStatus = orders.filter(order => order.status === status);
      const totalValueUSD = ordersWithStatus.reduce((sum, order) => {
        const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
        const qty = parseInt(order.quantity?.toString() || '1') || 1;
        const orderValue = cost * qty;

        // Use the centralized currency converter instead of hardcoded rates
        return sum + convertCurrency(orderValue, order.currency || 'USD', 'USD');
      }, 0);
      values[status] = convertCurrency(totalValueUSD, 'USD', displayCurrency);
    });
    return values;
  }, [metrics?.statusBreakdown, orders, convertCurrency, displayCurrency]);

  // Calculate values for upcoming payments (convert to USD then to display currency)
  const upcomingValues = useMemo(() => {
    if (!metrics || !orders) return {
      next7Days: 0,
      next30Days: 0,
      next90Days: 0,
      dateRange: 0
    };
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const pendingOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase().trim();
      return status === 'approved' || status === 'non-submitted';
    });
    const calculateUpcomingValue = (endDate: Date, startDate?: Date) => {
      const start = startDate || now;
      const upcomingOrders = pendingOrders.filter(o => {
        if (!o.shipment_date) return false;
        try {
          const shipmentDate = new Date(o.shipment_date);
          const dueDate = new Date(shipmentDate);
          dueDate.setDate(dueDate.getDate() + creditDays);
          return dueDate <= endDate && dueDate >= start;
        } catch {
          return false;
        }
      });
      const totalValueUSD = upcomingOrders.reduce((sum, order) => {
        const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
        const qty = parseInt(order.quantity?.toString() || '1') || 1;
        const orderValue = cost * qty;

        // Use the centralized currency converter instead of hardcoded rates
        return sum + convertCurrency(orderValue, order.currency || 'USD', 'USD');
      }, 0);
      return convertCurrency(totalValueUSD, 'USD', displayCurrency);
    };

    // Calculate custom date range value if both dates are selected
    const dateRangeValue = 0;
    return {
      next7Days: calculateUpcomingValue(next7Days),
      next30Days: calculateUpcomingValue(next30Days),
      next90Days: calculateUpcomingValue(next90Days),
      dateRange: dateRangeValue
    };
  }, [metrics, orders, convertCurrency, displayCurrency, selectedCountry, creditDays]);

  // Monthly trend data for chart - MUST be before any early returns
  const monthlyTrendData = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    // Helper to get month key (YYYY-MM format)
    const getMonthKey = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // Helper to get month label (e.g., "Oct 2024")
    const getMonthLabel = (monthKey: string) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
    };

    // Group orders by month
    const monthlyData = new Map<string, {
      totalOrders: number;
      paidValue: number;
      upcomingValue: number;
    }>();
    const now = new Date();
    orders.forEach(order => {
      if (!order.shipment_date) return;
      const shipmentDate = new Date(order.shipment_date);
      const monthKey = getMonthKey(shipmentDate);
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          totalOrders: 0,
          paidValue: 0,
          upcomingValue: 0
        });
      }
      const data = monthlyData.get(monthKey)!;

      // Increment total orders
      data.totalOrders += 1;

      // Calculate order value in display currency
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValueUSD = cost * qty;
      const orderValue = convertCurrency(orderValueUSD, order.currency || 'USD', displayCurrency);

      // Check if paid
      const paymentStatus = (order.payment_status || '').toLowerCase().trim();
      const status = (order.status || '').toLowerCase().trim();
      const isPaid = paymentStatus === 'completed' || status === 'paid';
      if (isPaid) {
        data.paidValue += orderValue;
      } else {
        // Check if upcoming (due date in future)
        const dueDate = new Date(shipmentDate);
        dueDate.setDate(dueDate.getDate() + creditDays);
        if (dueDate > now) {
          data.upcomingValue += orderValue;
        }
      }
    });

    // Convert to array and sort by month
    const sortedData = Array.from(monthlyData.entries()).map(([monthKey, data]) => ({
      month: getMonthLabel(monthKey),
      monthKey,
      ...data
    })).sort((a, b) => a.monthKey.localeCompare(b.monthKey)).slice(-12); // Last 12 months only

    return sortedData;
  }, [orders, creditDays, displayCurrency, convertCurrency]);

  // Calculate weekly upcoming payments with navigation
  const weeklyUpcomingPayments = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    const pendingOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase().trim();
      return status === 'approved' || status === 'non-submitted';
    });
    const weeks = [];
    // Show 4 weeks based on offset: offset 0 = current week + 3 future, offset -1 = 1 past + current + 2 future, etc.
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      // Calculate week start based on offset
      weekStart.setDate(now.getDate() + (upcomingWeeksOffset * 4 + i) * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekOrders = pendingOrders.filter(o => {
        if (!o.shipment_date) return false;
        try {
          const shipmentDate = new Date(o.shipment_date);
          const dueDate = new Date(shipmentDate);
          dueDate.setDate(dueDate.getDate() + creditDays);
          return dueDate >= weekStart && dueDate <= weekEnd;
        } catch {
          return false;
        }
      });
      const weekValue = weekOrders.reduce((sum, order) => {
        const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
        const qty = parseInt(order.quantity?.toString() || '1') || 1;
        const orderValue = cost * qty;

        // Use the centralized currency converter instead of hardcoded rates
        return sum + convertCurrency(orderValue, order.currency || 'USD', 'USD');
      }, 0);
      const formatDate = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()}-${months[date.getMonth()]}`;
      };
      const currentWeek = new Date();
      currentWeek.setHours(0, 0, 0, 0);
      const isPast = weekEnd < currentWeek;
      const isCurrentWeek = weekStart <= currentWeek && weekEnd >= currentWeek;
      weeks.push({
        label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
        orders: weekOrders.length,
        value: convertCurrency(weekValue, 'USD', displayCurrency),
        isPast,
        isCurrentWeek
      });
    }
    return weeks;
  }, [orders, convertCurrency, displayCurrency, selectedCountry, upcomingWeeksOffset]);

  // Calculate weekly performance data
  const weeklyData = useMemo(() => {
    if (!orders) return [];
    const now = new Date();
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      // Adjust for weekOffset: negative = past weeks, positive = future weeks
      weekStart.setDate(now.getDate() - (i + 1) * 7 + weekOffset * 28); // 28 days = 4 weeks
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekOrders = orders.filter(order => {
        if (!order.shipment_date) return false;
        const shipmentDate = new Date(order.shipment_date);
        return shipmentDate >= weekStart && shipmentDate <= weekEnd;
      });
      const weekValue = weekOrders.reduce((sum, order) => {
        const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
        const qty = parseInt(order.quantity?.toString() || '1') || 1;
        const orderValue = cost * qty;

        // Use the centralized currency converter instead of hardcoded rates
        return sum + convertCurrency(orderValue, order.currency || 'USD', 'USD');
      }, 0);
      weeks.unshift({
        label: `${weekStart.getDate()}-${weekStart.toLocaleDateString('en-US', {
          month: 'short'
        })} to ${weekEnd.getDate()}-${weekEnd.toLocaleDateString('en-US', {
          month: 'short'
        })}`,
        orders: weekOrders.length,
        value: convertCurrency(weekValue, 'USD', displayCurrency)
      });
    }
    return weeks;
  }, [orders, convertCurrency, displayCurrency, weekOffset]);
  console.log('MetricsDashboard render - Country:', selectedCountry, 'Display Currency:', displayCurrency, 'Total Value:', metrics?.totalValue, 'Converted:', convertedTotalValue);
  if (loading) {
    return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>)}
      </div>;
  }
  if (!metrics) return null;

  return <div className="space-y-6">
      {/* Main Metrics Row */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {metrics.totalOrders}
            </div>
            <div className="text-xl font-semibold text-primary mt-1">
              {formatCurrency(convertedTotalValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All fulfillment orders ({displayCurrency})
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 via-background to-background hover:shadow-xl transition-all duration-300 hover:scale-[1.02]" key={renderKey}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Payments</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500/70 dark:from-green-400 dark:to-green-500/70 bg-clip-text text-transparent">
              {metrics.paidPayments}
            </div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-400 mt-1">
              {formatCurrency(convertedPaidValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Completed payments ({displayCurrency})
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-500/5 via-background to-background hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500/70 dark:from-yellow-400 dark:to-yellow-500/70 bg-clip-text text-transparent">
              {metrics.pendingPayments}
            </div>
            <div className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mt-1">
              {formatCurrency(convertedPendingValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Approved + Non-submitted orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 via-background to-background hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-500/70 dark:from-red-400 dark:to-red-500/70 bg-clip-text text-transparent">
              {metrics.overduePayments}
            </div>
            <div className="text-xl font-semibold text-red-600 dark:text-red-400 mt-1">
              {formatCurrency(convertedOverdueValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Past {selectedCountry === 'UAE' ? '60' : '45'}-day credit period ({selectedCountry})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Graph */}
      <Card className="relative border-l-4 border-l-primary border-2 shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                Monthly Performance Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Trend analysis of orders, paid payments, and upcoming payments (Last 12 months)
              </p>
            </div>
            {monthlyTrendData && monthlyTrendData.length > 0 && <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-primary">
                  {monthlyTrendData.reduce((sum, m) => sum + m.totalOrders, 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Avg/Month</p>
                <p className="text-2xl font-bold text-chart-2">
                  {Math.round(monthlyTrendData.reduce((sum, m) => sum + m.totalOrders, 0) / monthlyTrendData.length)}
                </p>
              </div>
            </div>}
          </div>
        </CardHeader>
        <CardContent>
          {!monthlyTrendData || monthlyTrendData.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              No monthly data available
            </div> : <ChartContainer config={{
            totalOrders: {
              label: "Total Orders",
              color: "hsl(var(--primary))"
            },
            paidValue: {
              label: "Paid Payments",
              color: "hsl(var(--chart-2))"
            },
            upcomingValue: {
              label: "Upcoming Payments",
              color: "hsl(var(--chart-3))"
            }
          }} className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendData} margin={{
                  top: 30,
                  right: 40,
                  left: 30,
                  bottom: 30
                }}>
                  <defs>
                    <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="upcomingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} className="stroke-muted" />
                  <XAxis dataKey="month" tick={{
                    fill: 'hsl(var(--foreground))',
                    fontSize: 12,
                    fontWeight: 500
                  }} tickLine={{
                    stroke: 'hsl(var(--border))'
                  }} axisLine={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 2
                  }} />
                  <YAxis yAxisId="left" tick={{
                    fill: 'hsl(var(--muted-foreground))'
                  }} tickLine={{
                    stroke: 'hsl(var(--border))'
                  }} label={{
                    value: `Payments (${displayCurrency})`,
                    angle: -90,
                    position: 'insideLeft',
                    style: {
                      fill: 'hsl(var(--foreground))',
                      fontWeight: 600,
                      fontSize: 14
                    }
                  }} className="text-sm font-medium" />
                  <YAxis yAxisId="right" orientation="right" tick={{
                    fill: 'hsl(var(--muted-foreground))'
                  }} tickLine={{
                    stroke: 'hsl(var(--border))'
                  }} label={{
                    value: 'Total Orders',
                    angle: 90,
                    position: 'insideRight',
                    style: {
                      fill: 'hsl(var(--foreground))',
                      fontWeight: 600,
                      fontSize: 14
                    }
                  }} className="text-sm font-medium" />
                  <ChartTooltip content={({
                    active,
                    payload
                  }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return <div className="rounded-xl border-2 bg-background/95 backdrop-blur-sm p-4 shadow-2xl">
                        <div className="flex items-center gap-2 font-bold text-lg mb-3 border-b pb-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          {payload[0].payload.month}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/70" />
                              <span className="text-muted-foreground">Total Orders:</span>
                            </div>
                            <span className="font-bold text-lg">{payload[0].payload.totalOrders}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full" style={{
                              backgroundColor: 'hsl(var(--chart-2))'
                            }} />
                              <span className="text-muted-foreground">Paid:</span>
                            </div>
                            <span className="font-bold text-lg text-chart-2">
                              {formatCurrency(payload[0].payload.paidValue, displayCurrency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full" style={{
                              backgroundColor: 'hsl(var(--chart-3))'
                            }} />
                              <span className="text-muted-foreground">Upcoming:</span>
                            </div>
                            <span className="font-bold text-lg text-chart-3">
                              {formatCurrency(payload[0].payload.upcomingValue, displayCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>;
                  }} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{
                    paddingBottom: '20px',
                    fontSize: '13px',
                    fontWeight: 600
                  }} iconType="circle" iconSize={12} />
                  <Area yAxisId="left" type="monotone" dataKey="paidValue" fill="url(#paidGradient)" stroke="none" fillOpacity={1} />
                  <Area yAxisId="left" type="monotone" dataKey="upcomingValue" fill="url(#upcomingGradient)" stroke="none" fillOpacity={1} />
                  <Bar yAxisId="right" dataKey="totalOrders" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Total Orders" />
                  <Line yAxisId="left" type="monotone" dataKey="paidValue" stroke="hsl(var(--chart-2))" strokeWidth={4} dot={{
                    fill: 'hsl(var(--chart-2))',
                    r: 6,
                    strokeWidth: 3,
                    stroke: '#fff',
                    filter: 'drop-shadow(0 0 4px hsl(var(--chart-2)))'
                  }} activeDot={{
                    r: 8,
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 0 8px hsl(var(--chart-2)))'
                  }} name="Paid Payments" />
                  <Line yAxisId="left" type="monotone" dataKey="upcomingValue" stroke="hsl(var(--chart-3))" strokeWidth={4} dot={{
                    fill: 'hsl(var(--chart-3))',
                    r: 6,
                    strokeWidth: 3,
                    stroke: '#fff',
                    filter: 'drop-shadow(0 0 4px hsl(var(--chart-3)))'
                  }} activeDot={{
                    r: 8,
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 0 8px hsl(var(--chart-3)))'
                  }} strokeDasharray="8 4" name="Upcoming Payments" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>}
        </CardContent>
      </Card>

      {/* Secondary Metrics Row */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.statusBreakdown).map(([status, count]) => <div key={status} className="flex justify-between items-center">
                  <span className="text-sm">{status}</span>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline">{count}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(statusValues[status] || 0, displayCurrency)}
                    </span>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-warning" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              
              <div className="space-y-3 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Next 7 days</span>
                  <div className="flex flex-col items-end">
                    <Badge variant={metrics.upcomingPayments.next7Days > 0 ? 'destructive' : 'outline'}>
                      {metrics.upcomingPayments.next7Days}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(upcomingValues.next7Days, displayCurrency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Next 30 days</span>
                  <div className="flex flex-col items-end">
                    <Badge variant={metrics.upcomingPayments.next30Days > 0 ? 'default' : 'outline'}>
                      {metrics.upcomingPayments.next30Days}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(upcomingValues.next30Days, displayCurrency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Next 90 days</span>
                  <div className="flex flex-col items-end">
                    <Badge variant="secondary">
                      {metrics.upcomingPayments.next90Days}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(upcomingValues.next90Days, displayCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Full Width Cards */}
      

      {/* Payment Details Section - Simple Date Range with Amount */}
      <div className="w-full">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Payment Details by Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date Range:</label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full max-w-md" />
              </div>
              
              {dateRange?.from && dateRange?.to && <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="text-2xl font-bold text-destructive">
                      {orders?.filter(o => {
                    if (!o.shipment_date) return false;
                    const status = (o.status || '').toLowerCase().trim();
                    if (status !== 'approved' && status !== 'non-submitted') return false;
                    try {
                      const shipmentDate = new Date(o.shipment_date);
                      const dueDate = new Date(shipmentDate);
                      dueDate.setDate(dueDate.getDate() + creditDays);
                      const now = new Date();
                      return dueDate < now && dueDate >= dateRange.from && dueDate <= dateRange.to;
                    } catch {
                      return false;
                    }
                  }).length || 0}
                    </div>
                    <p className="text-sm font-medium text-destructive">Overdue</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(orders?.filter(o => {
                    if (!o.shipment_date) return false;
                    const status = (o.status || '').toLowerCase().trim();
                    if (status !== 'approved' && status !== 'non-submitted') return false;
                    try {
                      const shipmentDate = new Date(o.shipment_date);
                      const dueDate = new Date(shipmentDate);
                      dueDate.setDate(dueDate.getDate() + creditDays);
                      const now = new Date();
                      return dueDate < now && dueDate >= dateRange.from && dueDate <= dateRange.to;
                    } catch {
                      return false;
                    }
                  }).reduce((sum, order) => {
                    const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
                    const qty = parseInt(order.quantity?.toString() || '1') || 1;
                    const orderValue = cost * qty;
                    return sum + convertCurrency(orderValue, order.currency || 'USD', displayCurrency);
                  }, 0) || 0, displayCurrency)}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="text-2xl font-bold text-warning">
                      {orders?.filter(o => {
                    if (!o.shipment_date) return false;
                    const status = (o.status || '').toLowerCase().trim();
                    if (status !== 'approved' && status !== 'non-submitted') return false;
                    try {
                      const shipmentDate = new Date(o.shipment_date);
                      const dueDate = new Date(shipmentDate);
                      dueDate.setDate(dueDate.getDate() + creditDays);
                      const now = new Date();
                      return dueDate >= now && dueDate >= dateRange.from && dueDate <= dateRange.to;
                    } catch {
                      return false;
                    }
                  }).length || 0}
                    </div>
                    <p className="text-sm font-medium text-warning">Pending</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(orders?.filter(o => {
                    if (!o.shipment_date) return false;
                    const status = (o.status || '').toLowerCase().trim();
                    if (status !== 'approved' && status !== 'non-submitted') return false;
                    try {
                      const shipmentDate = new Date(o.shipment_date);
                      const dueDate = new Date(shipmentDate);
                      dueDate.setDate(dueDate.getDate() + creditDays);
                      const now = new Date();
                      return dueDate >= now && dueDate >= dateRange.from && dueDate <= dateRange.to;
                    } catch {
                      return false;
                    }
                  }).reduce((sum, order) => {
                    const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
                    const qty = parseInt(order.quantity?.toString() || '1') || 1;
                    const orderValue = cost * qty;
                    return sum + convertCurrency(orderValue, order.currency || 'USD', displayCurrency);
                  }, 0) || 0, displayCurrency)}
                    </p>
                  </div>

                  <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-2xl font-bold text-primary">
                      {orders?.filter(o => {
                    if (!o.shipment_date) return false;
                    const status = (o.status || '').toLowerCase().trim();
                    if (status !== 'approved' && status !== 'non-submitted') return false;
                    try {
                      const shipmentDate = new Date(o.shipment_date);
                      const dueDate = new Date(shipmentDate);
                      dueDate.setDate(dueDate.getDate() + creditDays);
                      return dueDate >= dateRange.from && dueDate <= dateRange.to;
                    } catch {
                      return false;
                    }
                  }).length || 0}
                    </div>
                    <p className="text-sm font-medium text-primary">Total</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(orders?.filter(o => {
                    if (!o.shipment_date) return false;
                    const status = (o.status || '').toLowerCase().trim();
                    if (status !== 'approved' && status !== 'non-submitted') return false;
                    try {
                      const shipmentDate = new Date(o.shipment_date);
                      const dueDate = new Date(shipmentDate);
                      dueDate.setDate(dueDate.getDate() + creditDays);
                      return dueDate >= dateRange.from && dueDate <= dateRange.to;
                    } catch {
                      return false;
                    }
                  }).reduce((sum, order) => {
                    const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
                    const qty = parseInt(order.quantity?.toString() || '1') || 1;
                    const orderValue = cost * qty;
                    return sum + convertCurrency(orderValue, order.currency || 'USD', displayCurrency);
                  }, 0) || 0, displayCurrency)}
                    </p>
                  </div>
                </div>}

              {(!dateRange?.from || !dateRange?.to) && <div className="text-center py-8 text-muted-foreground">
                  Please select a date range to view payment details
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};