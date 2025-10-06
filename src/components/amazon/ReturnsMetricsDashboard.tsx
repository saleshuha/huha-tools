import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingDown, TrendingUp, BarChart3, ImageOff, Download } from 'lucide-react';
import { ReturnsMetrics } from '@/types/amazon-returns';
import { useProductImages } from '@/hooks/useProductImages';
import { AmazonReturn } from '@/types/amazon-returns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

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

  // Count items without images and get the list
  const itemsWithoutImagesData = React.useMemo(() => {
    if (!productImages || !returns) return [];
    return returns.filter(item => {
      const hasImage = productImages.some(img => img.asin === item.asin);
      return !hasImage;
    });
  }, [productImages, returns]);

  const itemsWithoutImages = itemsWithoutImagesData.length;

  const exportMissingImages = () => {
    if (itemsWithoutImagesData.length === 0) {
      toast.error('No items without images to export');
      return;
    }

    const exportData = itemsWithoutImagesData.map(item => ({
      ASIN: item.asin,
      'Product Title': item.product_title || '-',
      'Shipped Units': item.shipped_units,
      'Returned Units': item.returned_units,
      'Return Ratio %': Number(item.return_ratio).toFixed(2),
      'Upload Date': new Date(item.upload_date).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Missing Images');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row] || '').length)
        )
      )
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `missing-images-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${itemsWithoutImagesData.length} items without images`);
  };
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
        <CardContent className="space-y-3">
          <div>
            <div className="text-2xl font-bold">{itemsWithoutImages}</div>
            <p className="text-xs text-muted-foreground">
              {returns.length > 0 ? ((itemsWithoutImages / returns.length) * 100).toFixed(1) : 0}% of products
            </p>
          </div>
          {itemsWithoutImages > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={exportMissingImages}
            >
              <Download className="w-3 h-3 mr-2" />
              Export List
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
