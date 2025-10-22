import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Truck, 
  Clock,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusMetrics {
  unpaid: number;
  pending: number;
  paid: number;
  shipped: number;
  delivered: number;
  total: number;
  totalValue: number;
}

interface StatusMetricsCardsProps {
  metrics: StatusMetrics;
  className?: string;
}

const statusConfigs = [
  {
    key: 'unpaid' as keyof StatusMetrics,
    label: 'Unpaid',
    icon: AlertTriangle,
    borderColor: 'border-l-orange-500',
    iconColor: 'text-orange-600',
    valueColor: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
  {
    key: 'pending' as keyof StatusMetrics,
    label: 'Pending',
    icon: Clock,
    borderColor: 'border-l-yellow-500',
    iconColor: 'text-yellow-600',
    valueColor: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
  },
  {
    key: 'paid' as keyof StatusMetrics,
    label: 'Paid',
    icon: CheckCircle,
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'shipped' as keyof StatusMetrics,
    label: 'Shipped',
    icon: Truck,
    borderColor: 'border-l-purple-500',
    iconColor: 'text-purple-600',
    valueColor: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  {
    key: 'delivered' as keyof StatusMetrics,
    label: 'Delivered',
    icon: Package,
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-600',
    valueColor: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'totalValue' as keyof StatusMetrics,
    label: 'Total Value',
    icon: DollarSign,
    borderColor: 'border-l-primary',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
    bgColor: 'bg-primary/10',
    isCurrency: true,
  }
];

export function StatusMetricsCards({ metrics, className }: StatusMetricsCardsProps) {
  const getPercentage = (value: number) => {
    return metrics.total > 0 ? Math.round((value / metrics.total) * 100) : 0;
  };

  const formatValue = (value: number, isCurrency?: boolean) => {
    if (isCurrency) {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4", className)}>
      {statusConfigs.map((config, index) => {
        const value = metrics[config.key];
        const percentage = config.isCurrency ? 0 : getPercentage(value as number);
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
                  {formatValue(value as number, config.isCurrency)}
                </div>
                {!config.isCurrency && (
                  <div className="text-xs text-muted-foreground truncate">
                    {percentage}% of total
                  </div>
                )}
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
