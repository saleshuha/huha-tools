import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingDown, BarChart3, Target } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCurrencyDisplay } from '@/components/amazon/CurrencySelector';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';

interface PaymentAgingChartProps {
  orders: any[];
}

export const PaymentAgingChart = ({ orders }: PaymentAgingChartProps) => {
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { displayCurrency } = useCurrencyDisplay();
  const { creditDays } = usePaymentTerms();

  const agingData = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    const now = new Date();
    const buckets = [
      { label: '0–30 days', min: 0, max: 30, count: 0, value: 0, color: 'bg-green-500' },
      { label: '30–60 days', min: 30, max: 60, count: 0, value: 0, color: 'bg-yellow-500' },
      { label: '60–90 days', min: 60, max: 90, count: 0, value: 0, color: 'bg-orange-500' },
      { label: '90+ days', min: 90, max: Infinity, count: 0, value: 0, color: 'bg-red-500' },
    ];

    const pendingOrders = orders.filter(o => {
      const status = (o.status || '').toLowerCase().trim();
      const paymentStatus = (o.payment_status || '').toLowerCase().trim();
      return (status === 'approved' || status === 'non-submitted') && paymentStatus !== 'completed';
    });

    let totalPaidValue = 0;
    let totalValue = 0;
    let totalDaysToPay = 0;
    let paidCount = 0;

    orders.forEach(order => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      const convertedValue = convertCurrency(orderValue, order.currency || 'USD', displayCurrency);
      totalValue += convertedValue;

      const paymentStatus = (order.payment_status || '').toLowerCase().trim();
      const status = (order.status || '').toLowerCase().trim();
      if (paymentStatus === 'completed' || status === 'paid') {
        totalPaidValue += convertedValue;
        if (order.shipment_date && order.payment_completed_date) {
          const ship = new Date(order.shipment_date);
          const paid = new Date(order.payment_completed_date);
          totalDaysToPay += Math.max(0, Math.floor((paid.getTime() - ship.getTime()) / (1000 * 60 * 60 * 24)));
          paidCount++;
        }
      }
    });

    pendingOrders.forEach(order => {
      if (!order.shipment_date) return;
      const shipmentDate = new Date(order.shipment_date);
      const dueDate = new Date(shipmentDate);
      dueDate.setDate(dueDate.getDate() + creditDays);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      const convertedValue = convertCurrency(orderValue, order.currency || 'USD', displayCurrency);

      for (const bucket of buckets) {
        if (daysOverdue >= bucket.min && daysOverdue < bucket.max) {
          bucket.count++;
          bucket.value += convertedValue;
          break;
        }
      }
    });

    const totalOverdue = buckets.reduce((s, b) => s + b.value, 0);
    const collectionRate = totalValue > 0 ? (totalPaidValue / totalValue) * 100 : 0;
    const avgDaysToPay = paidCount > 0 ? Math.round(totalDaysToPay / paidCount) : 0;

    return { buckets, totalOverdue, collectionRate, avgDaysToPay, totalPaidValue, totalValue };
  }, [orders, convertCurrency, displayCurrency, creditDays]);

  if (!agingData) return null;

  const maxBucketValue = Math.max(...agingData.buckets.map(b => b.value), 1);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* KPI Cards */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-green-500" />
            Collection Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {agingData.collectionRate.toFixed(1)}%
          </div>
          <Progress value={agingData.collectionRate} className="mt-2 h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatCurrency(agingData.totalPaidValue, displayCurrency)} of {formatCurrency(agingData.totalValue, displayCurrency)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            Avg Days to Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {agingData.avgDaysToPay || '—'}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {agingData.avgDaysToPay > 0
              ? agingData.avgDaysToPay > creditDays
                ? `${agingData.avgDaysToPay - creditDays} days over terms`
                : `${creditDays - agingData.avgDaysToPay} days under terms`
              : 'No completed payments yet'}
          </p>
        </CardContent>
      </Card>

      {/* Aging Breakdown */}
      <Card className="border-l-4 border-l-orange-500 md:row-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
            Payment Aging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {agingData.buckets.map(bucket => (
              <div key={bucket.label} className="space-y-0.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{bucket.count}</Badge>
                    <span className="font-medium w-20 text-right text-[11px]">
                      {formatCurrency(bucket.value, displayCurrency)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bucket.color} transition-all`}
                    style={{ width: `${(bucket.value / maxBucketValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
