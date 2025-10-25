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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const dataIssues = metrics.missingSku + metrics.missingTitle + metrics.missingImage;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        value={`${metrics.inStockCount} / ${metrics.inStockCount + metrics.outOfStockCount}`}
        subtitle={`${metrics.outOfStockCount} out of stock`}
        icon={Activity}
        gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        onClick={() => navigate('/inventory')}
      />
      
      {dataIssues > 0 && (
        <MetricCard
          title="Data Issues"
          value={dataIssues}
          subtitle="Items need attention"
          icon={AlertTriangle}
          gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          onClick={() => navigate('/inventory')}
        />
      )}
    </div>
  );
};
