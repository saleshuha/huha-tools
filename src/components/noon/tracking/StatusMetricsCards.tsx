import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Truck, 
  Package,
  TrendingUp,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusMetrics {
  uploaded: number;
  ready: number;
  placed: number;
  shipped: number;
  delivered: number;
  exception: number;
  total: number;
}

interface StatusMetricsCardsProps {
  metrics: StatusMetrics;
  className?: string;
}

const statusConfigs = [
  {
    key: 'uploaded' as keyof StatusMetrics,
    label: 'Uploaded',
    icon: Upload,
    gradient: 'bg-gradient-to-br from-sky/20 to-sky/10',
    iconColor: 'text-sky',
    progressColor: 'bg-sky',
  },
  {
    key: 'ready' as keyof StatusMetrics,
    label: 'Ready',
    icon: Target,
    gradient: 'bg-gradient-to-br from-emerald/20 to-emerald/10',
    iconColor: 'text-emerald',
    progressColor: 'bg-emerald',
  },
  {
    key: 'placed' as keyof StatusMetrics,
    label: 'Placed',
    icon: CheckCircle,
    gradient: 'bg-gradient-to-br from-primary/20 to-primary/10',
    iconColor: 'text-primary',
    progressColor: 'bg-primary',
  },
  {
    key: 'shipped' as keyof StatusMetrics,
    label: 'Shipped',
    icon: Truck,
    gradient: 'bg-gradient-to-br from-cyan/20 to-cyan/10',
    iconColor: 'text-cyan',
    progressColor: 'bg-cyan',
  },
  {
    key: 'delivered' as keyof StatusMetrics,
    label: 'Delivered',
    icon: Package,
    gradient: 'bg-gradient-to-br from-teal/20 to-teal/10',
    iconColor: 'text-teal',
    progressColor: 'bg-teal',
  },
  {
    key: 'exception' as keyof StatusMetrics,
    label: 'Issues',
    icon: AlertCircle,
    gradient: 'bg-gradient-to-br from-destructive/20 to-destructive/10',
    iconColor: 'text-destructive',
    progressColor: 'bg-destructive',
  }
];

export function StatusMetricsCards({ metrics, className }: StatusMetricsCardsProps) {
  const getPercentage = (value: number) => {
    return metrics.total > 0 ? Math.round((value / metrics.total) * 100) : 0;
  };

  const getGrowthIndicator = (value: number) => {
    // Simulate growth indicator - in real app, compare with previous period
    const growth = Math.random() * 20 - 10; // -10% to +10%
    return growth;
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4", className)}>
      {statusConfigs.map((config, index) => {
        const value = metrics[config.key];
        const percentage = getPercentage(value);
        const growth = getGrowthIndicator(value);
        const Icon = config.icon;

        return (
          <Card 
            key={config.key} 
            className={cn(
              "relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-medium group animate-fade-in",
              config.gradient
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-300 group-hover:scale-110",
                  config.gradient.replace('/20', '/30').replace('/10', '/20')
                )}>
                  <Icon className={cn("h-4 w-4", config.iconColor)} />
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-background/50 hover:bg-background/70 transition-colors"
                >
                  {percentage}%
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {value.toLocaleString()}
                  </span>
                  <div className={cn(
                    "flex items-center text-xs",
                    growth >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <TrendingUp className={cn(
                      "h-3 w-3 mr-1",
                      growth < 0 && "rotate-180"
                    )} />
                    {Math.abs(growth).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {config.label}
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                    <Progress 
                      value={percentage} 
                      className="h-full"
                      style={{
                        background: `linear-gradient(90deg, ${config.progressColor.replace('bg-', 'hsl(var(--')})}, transparent)`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}