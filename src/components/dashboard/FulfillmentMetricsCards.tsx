import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface FulfillmentMetricsCardsProps {
  metrics: {
    totalValue: number;
    paidValue: number;
    paidCount: number;
    pendingValue: number;
    pendingCount: number;
    overdueValue: number;
    overdueCount: number;
    upcomingPayments: {
      next7Days: { count: number; value: number };
      next30Days: { count: number; value: number };
      next90Days: { count: number; value: number };
    };
    creditDays: number;
  } | null;
  loading: boolean;
}

export const FulfillmentMetricsCards: React.FC<FulfillmentMetricsCardsProps> = ({
  metrics,
  loading
}) => {
  const navigate = useNavigate();

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (!metrics) return null;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/amazon-fulfillment-tracker')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Fulfillment Payments Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">${metrics.totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">${metrics.paidValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Paid ({metrics.paidCount})</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">${metrics.pendingValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending ({metrics.pendingCount})</p>
          </div>
        </div>

        {metrics.overdueValue > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-700 dark:text-red-400">Overdue Payments</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                ${metrics.overdueValue.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{metrics.overdueCount} orders</p>
          </div>
        )}

        {/* Upcoming Payments */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Payments
          </p>
          <div className="space-y-2">
            <PaymentRow 
              label="Next 7 days" 
              count={metrics.upcomingPayments.next7Days.count}
              value={metrics.upcomingPayments.next7Days.value}
            />
            <PaymentRow 
              label="Next 30 days" 
              count={metrics.upcomingPayments.next30Days.count}
              value={metrics.upcomingPayments.next30Days.value}
            />
            <PaymentRow 
              label="Next 90 days" 
              count={metrics.upcomingPayments.next90Days.count}
              value={metrics.upcomingPayments.next90Days.value}
            />
          </div>
        </div>

        {/* Credit Info */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Credit Period:</span>
          </div>
          <span className="font-semibold">{metrics.creditDays} days</span>
        </div>
      </CardContent>
    </Card>
  );
};

const PaymentRow: React.FC<{ label: string; count: number; value: number }> = ({
  label, count, value
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm">{label}</span>
    <div className="text-right">
      <p className="font-semibold">${value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{count} orders</p>
    </div>
  </div>
);
