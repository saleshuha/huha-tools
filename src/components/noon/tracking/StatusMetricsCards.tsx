import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Truck, 
  Package,
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
    borderColor: 'border-l-sky-500',
    iconColor: 'text-sky-600',
    valueColor: 'text-sky-600',
    bgColor: 'bg-sky-500/10',
  },
  {
    key: 'ready' as keyof StatusMetrics,
    label: 'Ready',
    icon: Target,
    borderColor: 'border-l-emerald-500',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  {
    key: 'placed' as keyof StatusMetrics,
    label: 'Placed',
    icon: CheckCircle,
    borderColor: 'border-l-primary',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    key: 'shipped' as keyof StatusMetrics,
    label: 'Shipped',
    icon: Truck,
    borderColor: 'border-l-cyan-500',
    iconColor: 'text-cyan-600',
    valueColor: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
  },
  {
    key: 'delivered' as keyof StatusMetrics,
    label: 'Delivered',
    icon: Package,
    borderColor: 'border-l-teal-500',
    iconColor: 'text-teal-600',
    valueColor: 'text-teal-600',
    bgColor: 'bg-teal-500/10',
  },
  {
    key: 'exception' as keyof StatusMetrics,
    label: 'Issues',
    icon: AlertCircle,
    borderColor: 'border-l-destructive',
    iconColor: 'text-destructive',
    valueColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
  }
];

export function StatusMetricsCards({ metrics, className }: StatusMetricsCardsProps) {
  const getPercentage = (value: number) => {
    return metrics.total > 0 ? Math.round((value / metrics.total) * 100) : 0;
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4", className)}>
      {statusConfigs.map((config, index) => {
        const value = metrics[config.key];
        const percentage = getPercentage(value);
        const Icon = config.icon;

        return (
          <Card 
            key={config.key} 
            className={cn(
              "cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4",
              config.borderColor
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1 p-4">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground truncate mb-1">{config.label}</div>
                <div className={cn("text-lg font-bold", config.valueColor)}>
                  {value.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {percentage}% of total
                </div>
              </div>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", config.bgColor)}>
                <Icon className={cn("h-3 w-3", config.iconColor)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}