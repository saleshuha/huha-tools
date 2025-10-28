import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { POOrder } from '@/hooks/usePOOrders';
import { usePOAnalytics } from '@/hooks/usePOAnalytics';
import { POVolumeChart } from './POVolumeChart';
import { POStatusPieChart } from './POStatusPieChart';
import { POMatchingStatsCard } from './POMatchingStatsCard';
import { POPrintCompletionChart } from './POPrintCompletionChart';
import { POSupplierAnalysis } from './POSupplierAnalysis';
import { BarChart3, Package, CheckCircle2, Printer } from 'lucide-react';

interface POAnalyticsDashboardProps {
  orders: POOrder[];
  isLoading?: boolean;
}

export const POAnalyticsDashboard: React.FC<POAnalyticsDashboardProps> = ({ 
  orders, 
  isLoading = false 
}) => {
  const analytics = usePOAnalytics(orders);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No Data Available</p>
          <p className="text-sm text-muted-foreground">Upload PO orders to see analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{analytics.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-2/10">
                <BarChart3 className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{analytics.totalQuantity.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-3/10">
                <CheckCircle2 className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Matched SKUs</p>
                <p className="text-2xl font-bold">{analytics.totalMatched}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-4/10">
                <Printer className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Printed Orders</p>
                <p className="text-2xl font-bold">{analytics.totalPrinted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart - Full Width */}
        <div className="lg:col-span-2">
          <POVolumeChart data={analytics.volumeByDate} />
        </div>

        {/* Status Distribution */}
        <POStatusPieChart data={analytics.statusDistribution} />

        {/* Print Completion */}
        <POPrintCompletionChart data={analytics.printCompletion} />

        {/* Matching Stats */}
        <POMatchingStatsCard data={analytics.matchingStats} />

        {/* Supplier Analysis */}
        <POSupplierAnalysis 
          topPOs={analytics.topPOs} 
          locations={analytics.locationDistribution} 
        />
      </div>
    </div>
  );
};
