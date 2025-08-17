import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Package, Clock, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { DashboardMetrics } from '@/types/amazon-fulfillment';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCountry } from '@/contexts/CountryContext';
import { useMemo } from 'react';

interface MetricsDashboardProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const MetricsDashboard = ({ metrics, loading }: MetricsDashboardProps) => {
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { selectedCountry } = useCountry();
  const countryCurrency = selectedCountry === 'UAE' ? 'AED' : 'SAR';
  
  // Force re-render when country or metrics change by creating a unique key
  const renderKey = `${selectedCountry}-${metrics?.totalValue || 0}`;
  
  // All hooks must be called before any early returns
  const convertedTotalValue = useMemo(() => {
    if (!metrics?.totalValue) return 0;
    const totalValue = parseFloat(metrics.totalValue?.toString()) || 0;
    const converted = convertCurrency(totalValue, 'USD', countryCurrency);
    console.log(`Converting ${totalValue} USD to ${countryCurrency}: ${converted}`);
    return converted;
  }, [metrics?.totalValue, countryCurrency, convertCurrency]);

  // Calculate converted values for pending and overdue amounts
  const convertedPendingValue = useMemo(() => {
    if (!metrics?.pendingValue) return 0;
    const pendingValue = parseFloat(metrics.pendingValue?.toString()) || 0;
    return convertCurrency(pendingValue, 'USD', countryCurrency);
  }, [metrics?.pendingValue, countryCurrency, convertCurrency]);

  const convertedOverdueValue = useMemo(() => {
    if (!metrics?.overdueValue) return 0;
    const overdueValue = parseFloat(metrics.overdueValue?.toString()) || 0;
    return convertCurrency(overdueValue, 'USD', countryCurrency);
  }, [metrics?.overdueValue, countryCurrency, convertCurrency]);

  console.log('MetricsDashboard render - Country:', selectedCountry, 'Currency:', countryCurrency, 'Total Value:', metrics?.totalValue, 'Converted:', convertedTotalValue);

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
              {formatCurrency(convertedTotalValue, countryCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined order value ({countryCurrency})
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
              {formatCurrency(convertedPendingValue, countryCurrency)}
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
              {formatCurrency(convertedOverdueValue, countryCurrency)}
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
                  <Badge variant="outline">{count}</Badge>
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
                  <Badge 
                    variant={status === 'completed' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}
                  >
                    {count}
                  </Badge>
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
                <Badge variant={metrics.upcomingPayments.next7Days > 0 ? 'destructive' : 'outline'}>
                  {metrics.upcomingPayments.next7Days}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Next 30 days</span>
                <Badge variant={metrics.upcomingPayments.next30Days > 0 ? 'default' : 'outline'}>
                  {metrics.upcomingPayments.next30Days}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Next 90 days</span>
                <Badge variant="secondary">
                  {metrics.upcomingPayments.next90Days}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};