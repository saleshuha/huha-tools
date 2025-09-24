import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, Clock, CheckCircle, AlertTriangle, Calendar, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardMetrics } from '@/types/amazon-fulfillment';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCurrencyDisplay } from '@/components/amazon/CurrencySelector';
import { useCountry } from '@/contexts/CountryContext';
import { useMemo, useState } from 'react';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';

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
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current 4 weeks, positive = future, negative = past
  const [upcomingWeeksOffset, setUpcomingWeeksOffset] = useState(0); // Separate offset for upcoming payments
  
  
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
    const values: { [key: string]: number } = {};
    
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
    if (!metrics || !orders) return { next7Days: 0, next30Days: 0, next90Days: 0, dateRange: 0 };
    
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
      weekStart.setDate(now.getDate() + ((upcomingWeeksOffset * 4) + i) * 7);
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
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
      weekStart.setDate(now.getDate() - (i + 1) * 7 + (weekOffset * 28)); // 28 days = 4 weeks
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
        label: `${weekStart.getDate()}-${weekStart.toLocaleDateString('en-US', { month: 'short' })} to ${weekEnd.getDate()}-${weekEnd.toLocaleDateString('en-US', { month: 'short' })}`,
        orders: weekOrders.length,
        value: convertCurrency(weekValue, 'USD', displayCurrency)
      });
    }
    
    return weeks;
  }, [orders, convertCurrency, displayCurrency, weekOffset]);

  console.log('MetricsDashboard render - Country:', selectedCountry, 'Display Currency:', displayCurrency, 'Total Value:', metrics?.totalValue, 'Converted:', convertedTotalValue);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Main Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <div className="text-lg font-semibold text-primary">
              {formatCurrency(convertedTotalValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              All fulfillment orders ({displayCurrency})
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success" key={renderKey}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{metrics.paidPayments}</div>
            <div className="text-lg font-semibold text-success">
              {formatCurrency(convertedPaidValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed payments ({displayCurrency})
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{metrics.pendingPayments}</div>
            <div className="text-lg font-semibold text-warning">
              {formatCurrency(convertedPendingValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved + Non-submitted orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.overduePayments}</div>
            <div className="text-lg font-semibold text-destructive">
              {formatCurrency(convertedOverdueValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Past {selectedCountry === 'UAE' ? '60' : '45'}-day credit period ({selectedCountry})
            </p>
          </CardContent>
        </Card>
      </div>

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
              {Object.entries(metrics.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm">{status}</span>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline">{count}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(statusValues[status] || 0, displayCurrency)}
                    </span>
                  </div>
                </div>
              ))}
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
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Weekly Performance (4 Weeks)
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyData.map((week, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">{week.label}</span>
                    <span className="text-xs text-muted-foreground">{week.orders} orders</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatCurrency(week.value, displayCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Weekly Upcoming Payments
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpcomingWeeksOffset(upcomingWeeksOffset - 1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpcomingWeeksOffset(upcomingWeeksOffset + 1)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyUpcomingPayments.map((week, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{week.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {week.isPast ? 'Past week' : week.isCurrentWeek ? 'Current week' : 'Upcoming week'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge 
                      variant={
                        week.orders > 0 
                          ? week.isPast 
                            ? 'secondary' 
                            : 'destructive' 
                          : 'outline'
                      } 
                      className="text-xs"
                    >
                      {week.orders} orders
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatCurrency(week.value, displayCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Total Unpaid Payments - Simple Metric Card */}
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {(metrics.pendingPayments || 0) + (metrics.overduePayments || 0)}
            </div>
            <div className="text-lg font-semibold text-accent">
              {formatCurrency((convertedPendingValue || 0) + (convertedOverdueValue || 0), displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending + Overdue payments ({displayCurrency})
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};