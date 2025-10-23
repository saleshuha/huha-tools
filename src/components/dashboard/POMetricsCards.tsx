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
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/po-tracker')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Purchase Orders Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{metrics.activeOrders}</p>
            <p className="text-xs text-muted-foreground">Active Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{metrics.activeQuantity.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Active Qty</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Status Breakdown</p>
          <div className="space-y-2">
            <StatusBar 
              label="Pending" 
              count={metrics.statusBreakdown.pending.count}
              value={metrics.statusBreakdown.pending.value}
              color="bg-yellow-500"
              percentage={(metrics.statusBreakdown.pending.count / metrics.activeOrders) * 100}
            />
            <StatusBar 
              label="Ordered" 
              count={metrics.statusBreakdown.ordered.count}
              value={metrics.statusBreakdown.ordered.value}
              color="bg-blue-500"
              percentage={(metrics.statusBreakdown.ordered.count / metrics.activeOrders) * 100}
            />
            <StatusBar 
              label="Shipped" 
              count={metrics.statusBreakdown.shipped.count}
              value={metrics.statusBreakdown.shipped.value}
              color="bg-purple-500"
              percentage={(metrics.statusBreakdown.shipped.count / metrics.activeOrders) * 100}
            />
            <StatusBar 
              label="Delivered" 
              count={metrics.statusBreakdown.delivered.count}
              value={metrics.statusBreakdown.delivered.value}
              color="bg-green-500"
              percentage={(metrics.statusBreakdown.delivered.count / metrics.activeOrders) * 100}
            />
          </div>
        </div>

        {/* Delivery Timeline */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Arriving:</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span><span className="font-semibold">{metrics.timeline.thisWeek}</span> this week</span>
            <span><span className="font-semibold">{metrics.timeline.thisMonth}</span> this month</span>
            {metrics.timeline.delayed > 0 && (
              <span className="text-red-600 font-semibold">{metrics.timeline.delayed} late</span>
            )}
          </div>
        </div>
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
