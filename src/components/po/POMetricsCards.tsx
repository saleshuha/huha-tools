import { Package, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface POMetricsCardsProps {
  totalItems: number;
  pendingUnits: number;
  fulfilledUnits: number;
  totalValue: number;
  currency: string;
  inStockCount: number;
  outOfStockCount: number;
  notFoundCount: number;
}

export function POMetricsCards({
  totalItems,
  pendingUnits,
  fulfilledUnits,
  totalValue,
  currency,
  inStockCount,
  outOfStockCount,
  notFoundCount
}: POMetricsCardsProps) {
  const totalUnits = pendingUnits + fulfilledUnits;
  const fulfillmentPercentage = totalUnits > 0 ? (fulfilledUnits / totalUnits) * 100 : 0;
  const inventoryTotal = inStockCount + outOfStockCount + notFoundCount;
  const matchedInStockPercentage = totalItems > 0 ? (inStockCount / totalItems) * 100 : 0;

  const metrics = [
    {
      label: 'Total Items',
      value: totalItems,
      percentage: `${totalUnits} units`,
      icon: Package,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500/10',
      iconBgColor: 'bg-blue-500/20',
      textColor: 'text-blue-500'
    },
    {
      label: 'Matched & In Stock',
      value: inStockCount,
      percentage: `${matchedInStockPercentage.toFixed(1)}% of total`,
      icon: TrendingUp,
      borderColor: 'border-l-green-500',
      bgColor: 'bg-green-500/10',
      iconBgColor: 'bg-green-500/20',
      textColor: 'text-green-500'
    },
    {
      label: 'Fulfilled',
      value: fulfilledUnits,
      percentage: `${fulfillmentPercentage.toFixed(1)}% done`,
      icon: CheckCircle,
      borderColor: 'border-l-emerald-500',
      bgColor: 'bg-emerald-500/10',
      iconBgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-500'
    },
    {
      label: 'Pending',
      value: pendingUnits,
      percentage: `${(100 - fulfillmentPercentage).toFixed(1)}% left`,
      icon: Clock,
      borderColor: 'border-l-yellow-500',
      bgColor: 'bg-yellow-500/10',
      iconBgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-500'
    },
    {
      label: 'In Stock',
      value: inStockCount,
      percentage: inventoryTotal > 0 ? `${((inStockCount / inventoryTotal) * 100).toFixed(0)}% available` : '0% available',
      icon: CheckCircle,
      borderColor: 'border-l-green-500',
      bgColor: 'bg-green-500/10',
      iconBgColor: 'bg-green-500/20',
      textColor: 'text-green-500'
    },
    {
      label: 'Out of Stock',
      value: outOfStockCount,
      percentage: inventoryTotal > 0 ? `${((outOfStockCount / inventoryTotal) * 100).toFixed(0)}% depleted` : '0% depleted',
      icon: AlertCircle,
      borderColor: 'border-l-orange-500',
      bgColor: 'bg-orange-500/10',
      iconBgColor: 'bg-orange-500/20',
      textColor: 'text-orange-500'
    },
    {
      label: 'Not Found',
      value: notFoundCount,
      percentage: inventoryTotal > 0 ? `${((notFoundCount / inventoryTotal) * 100).toFixed(0)}% unmatched` : '0% unmatched',
      icon: Package,
      borderColor: 'border-l-gray-500',
      bgColor: 'bg-gray-500/10',
      iconBgColor: 'bg-gray-500/20',
      textColor: 'text-gray-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            className={`h-20 ${metric.borderColor} border-l-4 ${metric.bgColor} hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-3 h-full flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate mb-1">
                  {metric.label}
                </p>
                <p className={`text-lg font-bold ${metric.textColor} mb-0.5`}>
                  {metric.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {metric.percentage}
                </p>
              </div>
              <div className={`w-6 h-6 rounded-full ${metric.iconBgColor} flex items-center justify-center flex-shrink-0 ml-2`}>
                <Icon className={`h-3 w-3 ${metric.textColor}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}