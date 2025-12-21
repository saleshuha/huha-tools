import React from 'react';
import { Card } from '@/components/ui/card';
import { Package, CheckCircle, AlertTriangle, XCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchingSummary } from '@/hooks/useInventoryMatching';

interface MatchingSummaryCardsProps {
  summary: MatchingSummary;
}

export function MatchingSummaryCards({ summary }: MatchingSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Items',
      value: summary.totalItems,
      subValue: `${summary.matchedCount} matched`,
      icon: Package,
      color: 'blue',
      bgClass: 'bg-blue-500/10',
      iconClass: 'text-blue-500',
      borderClass: 'border-blue-500/30'
    },
    {
      label: 'In Stock',
      value: summary.inStockCount,
      subValue: `${Math.round((summary.inStockCount / summary.totalItems) * 100) || 0}%`,
      icon: CheckCircle,
      color: 'green',
      bgClass: 'bg-green-500/10',
      iconClass: 'text-green-500',
      borderClass: 'border-green-500/30'
    },
    {
      label: 'Partial Stock',
      value: summary.partialCount,
      subValue: `${Math.round((summary.partialCount / summary.totalItems) * 100) || 0}%`,
      icon: AlertTriangle,
      color: 'orange',
      bgClass: 'bg-orange-500/10',
      iconClass: 'text-orange-500',
      borderClass: 'border-orange-500/30'
    },
    {
      label: 'Out of Stock',
      value: summary.outOfStockCount,
      subValue: `${Math.round((summary.outOfStockCount / summary.totalItems) * 100) || 0}%`,
      icon: XCircle,
      color: 'red',
      bgClass: 'bg-red-500/10',
      iconClass: 'text-red-500',
      borderClass: 'border-red-500/30'
    },
    {
      label: 'Total Required',
      value: summary.totalRequired,
      subValue: 'units needed',
      icon: TrendingUp,
      color: 'purple',
      bgClass: 'bg-purple-500/10',
      iconClass: 'text-purple-500',
      borderClass: 'border-purple-500/30'
    },
    {
      label: 'Total Shortage',
      value: summary.totalShortage,
      subValue: 'units missing',
      icon: TrendingDown,
      color: 'red',
      bgClass: 'bg-red-500/10',
      iconClass: 'text-red-500',
      borderClass: 'border-red-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <Card 
          key={card.label} 
          className={cn(
            'p-4 border transition-all duration-200 hover:shadow-md',
            card.borderClass
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className={cn('p-2 rounded-lg', card.bgClass)}>
              <card.icon className={cn('w-4 h-4', card.iconClass)} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tabular-nums">{card.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            <p className="text-xs text-muted-foreground/70">{card.subValue}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
