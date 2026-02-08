import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingDown, TrendingUp, BarChart3, ImageOff, Download, AlertTriangle, DollarSign } from 'lucide-react';
import { ReturnsMetrics } from '@/types/amazon-returns';
import { useProductImages } from '@/hooks/useProductImages';
import { AmazonReturn } from '@/types/amazon-returns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReturnsMetricsDashboardProps {
  metrics: ReturnsMetrics | null;
  loading: boolean;
  returns: AmazonReturn[];
  onAIInsightsClick?: () => void;
}

export const ReturnsMetricsDashboard: React.FC<ReturnsMetricsDashboardProps> = ({
  metrics,
  loading,
  returns,
  onAIInsightsClick,
}) => {
  const { productImages } = useProductImages();

  const itemsWithoutImagesData = React.useMemo(() => {
    if (!productImages || !returns) return [];
    return returns.filter(item => {
      const hasImage = productImages.some(img => img.asin === item.asin);
      return !hasImage;
    });
  }, [productImages, returns]);

  const itemsWithoutImages = itemsWithoutImagesData.length;

  const highConfidenceIssues = React.useMemo(() => {
    return returns.filter(item =>
      item.return_ratio > 50 && item.confidence_score > 70
    ).length;
  }, [returns]);

  const costImpact = React.useMemo(() => {
    const totalReturned = returns.reduce((sum, item) => sum + item.returned_units, 0);
    const avgCostPerReturn = 15;
    return Math.round(totalReturned * avgCostPerReturn * 0.7);
  }, [returns]);

  const distributionData = React.useMemo(() => {
    const high = returns.filter(r => Number(r.return_ratio) > 20).length;
    const medium = returns.filter(r => Number(r.return_ratio) > 10 && Number(r.return_ratio) <= 20).length;
    const low = returns.filter(r => Number(r.return_ratio) <= 10).length;
    return [
      { name: 'High (>20%)', value: high, color: 'hsl(var(--destructive))' },
      { name: 'Medium (10-20%)', value: medium, color: 'hsl(45, 93%, 47%)' },
      { name: 'Low (<10%)', value: low, color: 'hsl(152, 69%, 31%)' },
    ];
  }, [returns]);

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
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...exportData.map(row => String(row[key as keyof typeof row] || '').length)))
    }));
    ws['!cols'] = colWidths;
    XLSX.writeFile(wb, `missing-images-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${itemsWithoutImagesData.length} items without images`);
  };

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-12 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getReturnColor = (ratio: number) => {
    if (ratio > 20) return 'text-destructive';
    if (ratio > 10) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Core Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Total ASINs</span>
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.totalAsins.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">Products analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Total Shipped</span>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{metrics.totalShipped.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">{metrics.totalReturned.toLocaleString()} returned</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Avg Return Ratio</span>
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className={`text-2xl font-bold ${getReturnColor(metrics.averageReturnRatio)}`}>
              {metrics.averageReturnRatio.toFixed(2)}%
            </div>
            <p className="text-[11px] text-muted-foreground">Across all products</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Highest Return</span>
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            </div>
            {metrics.highestReturnAsin ? (
              <>
                <div className="text-2xl font-bold text-destructive">{metrics.highestReturnAsin.ratio.toFixed(1)}%</div>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{metrics.highestReturnAsin.asin}</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Missing Images</span>
              <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{itemsWithoutImages}</div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {returns.length > 0 ? ((itemsWithoutImages / returns.length) * 100).toFixed(0) : 0}% of products
              </p>
              {itemsWithoutImages > 0 && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={exportMissingImages}>
                  <Download className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Distribution + Cost Impact + High Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Return Rate Distribution</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={18}
                      outerRadius={36}
                      dataKey="value"
                      strokeWidth={1}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} ASINs`, '']}
                      contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                {distributionData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-semibold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Est. Cost Impact</span>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-destructive">${costImpact.toLocaleString()}</div>
            <p className="text-[11px] text-muted-foreground">
              Based on {metrics.totalReturned.toLocaleString()} returns @ avg $15/unit
            </p>
          </CardContent>
        </Card>

        <Card className={highConfidenceIssues > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">High Confidence Issues</span>
              <AlertTriangle className={`h-3.5 w-3.5 ${highConfidenceIssues > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div className={`text-2xl font-bold ${highConfidenceIssues > 0 ? 'text-destructive' : ''}`}>
              {highConfidenceIssues}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Return ratio &gt;50% with &gt;70% confidence
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
