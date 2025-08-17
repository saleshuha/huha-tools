import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { DashboardMetrics } from '@/types/amazon-fulfillment';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCurrencyDisplay } from '@/components/amazon/CurrencySelector';
import { useCountry } from '@/contexts/CountryContext';
import { useMemo } from 'react';

interface MetricsDashboardProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  orders?: any[];
}

export const MetricsDashboard = ({ metrics, loading, orders }: MetricsDashboardProps) => {
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { displayCurrency } = useCurrencyDisplay();
  const { selectedCountry } = useCountry();
  
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

  // Calculate values for status breakdown
  const statusValues = useMemo(() => {
    if (!metrics?.statusBreakdown || !metrics) return {};
    const values: { [key: string]: number } = {};
    
    Object.keys(metrics.statusBreakdown).forEach(status => {
      const ordersWithStatus = orders?.filter(order => order.status === status) || [];
      const totalValue = ordersWithStatus.reduce((sum, order) => {
        const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
        const qty = parseInt(order.quantity?.toString() || '1') || 1;
        return sum + (cost * qty);
      }, 0);
      values[status] = convertCurrency(totalValue, 'USD', displayCurrency);
    });
    
    return values;
  }, [metrics?.statusBreakdown, convertCurrency, displayCurrency]);

  // Calculate values for upcoming payments
  const upcomingValues = useMemo(() => {
    if (!metrics) return { next7Days: 0, next30Days: 0, next90Days: 0 };
    
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const pendingOrders = orders?.filter(o => {
      const status = (o.status || '').toLowerCase().trim();
      return status === 'approved' || status === 'non-submitted';
    }) || [];

    const calculateUpcomingValue = (endDate: Date) => {
      const upcomingOrders = pendingOrders.filter(o => {
        if (!o.invoice_date) return false;
        try {
          const invoiceDate = new Date(o.invoice_date);
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + 45);
          return dueDate <= endDate && dueDate >= now;
        } catch {
          return false;
        }
      });
      
      const totalValue = upcomingOrders.reduce((sum, order) => {
        const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
        const qty = parseInt(order.quantity?.toString() || '1') || 1;
        return sum + (cost * qty);
      }, 0);
      
      return convertCurrency(totalValue, 'USD', displayCurrency);
    };

    return {
      next7Days: calculateUpcomingValue(next7Days),
      next30Days: calculateUpcomingValue(next30Days),
      next90Days: calculateUpcomingValue(next90Days)
    };
  }, [metrics, orders, convertCurrency, displayCurrency]);

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
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Active fulfillment orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success" key={renderKey}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(convertedTotalValue, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined order value ({displayCurrency})
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingPayments}</div>
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
              Past 45-day credit period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <DollarSign className="h-5 w-5 text-primary" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.paymentStatusBreakdown).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex flex-col items-end">
                    <Badge 
                      variant={status === 'completed' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}
                    >
                      {count}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {status === 'pending' && formatCurrency(convertedPendingValue, displayCurrency)}
                      {status === 'overdue' && formatCurrency(convertedOverdueValue, displayCurrency)}
                      {status === 'completed' && formatCurrency(0, displayCurrency)}
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
            <div className="space-y-3">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};