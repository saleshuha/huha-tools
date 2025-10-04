import { TrendingUp, Package, AlertTriangle, Target, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VelocityMetrics } from "@/hooks/useUnifiedVelocityAnalytics";

interface VelocityDashboardHeaderProps {
  metrics: VelocityMetrics;
  loading: boolean;
}

export function VelocityDashboardHeader({ metrics, loading }: VelocityDashboardHeaderProps) {
  const stats = [
    {
      label: "Total Items Tracked",
      value: metrics.totalItems,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "Critical Stock Alerts",
      value: metrics.criticalStockItems,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      label: "High Urgency Items",
      value: metrics.totalUrgentItems,
      icon: Target,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      label: "Avg Confidence Score",
      value: `${metrics.avgConfidence.toFixed(0)}%`,
      icon: Activity,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      label: "Trending Up",
      value: metrics.trendingUpItems,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-12 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
