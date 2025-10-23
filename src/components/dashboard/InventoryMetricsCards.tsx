import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Activity, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryMetricsCardsProps {
  metrics: {
    totalAsins: number;
    totalSkus: number;
    inStockCount: number;
    outOfStockCount: number;
    totalAsinUnits: number;
    totalSkuUnits: number;
    soldAsinUnits: number;
    soldSkuUnits: number;
    missingSku: number;
    missingTitle: number;
    missingImage: number;
  } | null;
  loading: boolean;
}

export const InventoryMetricsCards: React.FC<InventoryMetricsCardsProps> = ({
  metrics,
  loading
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const sellThroughRate = metrics.totalAsinUnits > 0 
    ? ((metrics.soldAsinUnits / metrics.totalAsinUnits) * 100).toFixed(1)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <MetricCard
        title="Active Items"
        value={metrics.totalAsins + metrics.totalSkus}
        subtitle={`${metrics.totalAsins} ASINs, ${metrics.totalSkus} SKUs`}
        icon={Package}
        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        onClick={() => navigate('/inventory')}
      />
      
      <MetricCard
        title="Stock Status"
        value={metrics.inStockCount}
        subtitle={`${metrics.outOfStockCount} out of stock`}
        icon={Activity}
        gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        onClick={() => navigate('/inventory')}
      />
      
      <MetricCard
        title="Total Units"
        value={metrics.totalAsinUnits + metrics.totalSkuUnits}
        subtitle={`ASIN: ${metrics.totalAsinUnits}, SKU: ${metrics.totalSkuUnits}`}
        icon={BarChart3}
        gradient="bg-gradient-to-br from-purple-500 to-purple-600"
        onClick={() => navigate('/inventory')}
      />
      
      <MetricCard
        title="Sold Units (30d)"
        value={metrics.soldAsinUnits + metrics.soldSkuUnits}
        subtitle={`${sellThroughRate}% sell-through rate`}
        icon={TrendingUp}
        gradient="bg-gradient-to-br from-green-500 to-teal-600"
        onClick={() => navigate('/inventory')}
      />
      
      <MetricCard
        title="Data Quality"
        value={metrics.missingSku + metrics.missingTitle + metrics.missingImage}
        subtitle={`${metrics.missingSku} SKU, ${metrics.missingTitle} Title, ${metrics.missingImage} Image`}
        icon={AlertTriangle}
        gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        onClick={() => navigate('/inventory')}
      />
    </div>
  );
};
