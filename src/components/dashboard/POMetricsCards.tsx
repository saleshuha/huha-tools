import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface POMetricsCardsProps {
  metrics: {
    activeOrders: number;
    activeQuantity: number;
    uniquePOs: number;
    statusBreakdown: {
      pending: { count: number; value: number };
      ordered: { count: number; value: number };
      shipped: { count: number; value: number };
      delivered: { count: number; value: number };
    };
    timeline: {
      thisWeek: number;
      thisMonth: number;
      delayed: number;
    };
  } | null;
  loading: boolean;
}

export const POMetricsCards: React.FC<POMetricsCardsProps> = ({
  metrics,
  loading
}) => {
  const navigate = useNavigate();

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (!metrics) return null;

  const totalValue = Object.values(metrics.statusBreakdown).reduce((sum, status) => sum + status.value, 0);

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/po-tracker')}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Purchase Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Active Orders</p>
            <p className="text-xl font-bold">{metrics.activeOrders}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold">${totalValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ordered</p>
            <p className="text-lg font-semibold text-blue-600">{metrics.statusBreakdown.ordered.count}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Shipped</p>
            <p className="text-lg font-semibold text-purple-600">{metrics.statusBreakdown.shipped.count}</p>
          </div>
        </div>
        {metrics.timeline.delayed > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm text-red-600 font-semibold">{metrics.timeline.delayed} delayed orders</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatusBar: React.FC<{ label: string; count: number; value: number; color: string; percentage: number }> = ({
  label, count, value, color, percentage
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-sm">
      <span>{label} ({count})</span>
      <span className="font-semibold">${value.toLocaleString()}</span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div className={cn("h-2 rounded-full transition-all duration-300", color)} style={{ width: `${percentage}%` }} />
    </div>
  </div>
);
