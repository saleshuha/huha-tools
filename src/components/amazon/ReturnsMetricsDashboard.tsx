import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingDown, TrendingUp, BarChart3, ImageOff } from 'lucide-react';
import { ReturnsMetrics } from '@/types/amazon-returns';
import { useProductImages } from '@/hooks/useProductImages';
import { AmazonReturn } from '@/types/amazon-returns';

interface ReturnsMetricsDashboardProps {
  metrics: ReturnsMetrics | null;
  loading: boolean;
  returns: AmazonReturn[];
}

export const ReturnsMetricsDashboard: React.FC<ReturnsMetricsDashboardProps> = ({
  metrics,
  loading,
  returns,
}) => {
  const { productImages } = useProductImages();

  // Count items without images
  const itemsWithoutImages = React.useMemo(() => {
    if (!productImages || !returns) return 0;
    return returns.filter(item => {
      const hasImage = productImages.some(img => img.asin === item.asin);
      return !hasImage;
    }).length;
  }, [productImages, returns]);
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getReturnColor = (ratio: number) => {
    if (ratio > 20) return 'text-destructive';
    if (ratio > 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total ASINs</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAsins.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Products analyzed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Shipped</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalShipped.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.totalReturned.toLocaleString()} returned
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Return Ratio</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getReturnColor(metrics.averageReturnRatio)}`}>
            {metrics.averageReturnRatio.toFixed(2)}%
          </div>
          <p className="text-xs text-muted-foreground">Across all products</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Highest Return</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {metrics.highestReturnAsin ? (
            <>
              <div className="text-2xl font-bold text-destructive">
                {metrics.highestReturnAsin.ratio.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {metrics.highestReturnAsin.asin}
              </p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Missing Images</CardTitle>
          <ImageOff className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{itemsWithoutImages}</div>
          <p className="text-xs text-muted-foreground">
            {returns.length > 0 ? ((itemsWithoutImages / returns.length) * 100).toFixed(1) : 0}% of products
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
