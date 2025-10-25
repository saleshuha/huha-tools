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
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/amazon-fulfillment-tracker')}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold">${metrics.totalValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-amber-600">${metrics.pendingValue.toLocaleString()}</p>
          </div>
          {metrics.overdueValue > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Overdue</p>
              <p className="text-xl font-bold text-red-600">${metrics.overdueValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{metrics.overdueCount} orders</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Next 7 Days</p>
            <p className="text-lg font-semibold">${metrics.upcomingPayments.next7Days.value.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Next 30 Days</p>
            <p className="text-lg font-semibold">${metrics.upcomingPayments.next30Days.value.toLocaleString()}</p>
          </div>
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
