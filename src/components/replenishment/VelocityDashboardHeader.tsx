import { Card } from '@/components/ui/card';
import { TrendingUp, Package, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { VelocityMetrics } from '@/hooks/useUnifiedVelocityAnalytics';

interface VelocityDashboardHeaderProps {
  metrics: VelocityMetrics;
  loading: boolean;
}

export function VelocityDashboardHeader({ metrics, loading }: VelocityDashboardHeaderProps) {
  const stats = [
    {
      label: 'Total Items',
      value: metrics.totalItems,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Ready to Order',
      value: metrics.readyToOrder,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Critical Stock',
      value: metrics.criticalStockItems,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      label: 'Trending Up',
      value: metrics.trendingUpItems,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: 'Avg Confidence',
      value: `${Math.round(metrics.avgConfidence)}%`,
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-12 bg-muted rounded mb-2" />
            <div className="h-8 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </div>
          <div className="text-3xl font-bold">{stat.value}</div>
        </Card>
      ))}
    </div>
  );
}
