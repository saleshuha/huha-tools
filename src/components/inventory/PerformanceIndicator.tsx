import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceIndicatorProps {
  velocityCategory: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales' | null;
  salesVelocity: number;
  stockDaysRemaining: number | null;
  urgencyScore: number;
  compact?: boolean;
}

export function PerformanceIndicator({
  velocityCategory,
  salesVelocity,
  stockDaysRemaining,
  urgencyScore,
  compact = false
}: PerformanceIndicatorProps) {
  const getVelocityBadge = () => {
    switch (velocityCategory) {
      case 'Fast Moving':
        return {
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
          icon: TrendingUp
        };
      case 'Medium Moving':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: Minus
        };
      case 'Slow Moving':
        return {
          variant: 'outline' as const,
          className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30',
          icon: TrendingDown
        };
      case 'No Sales':
        return {
          variant: 'destructive' as const,
          className: 'bg-destructive/10 text-destructive border-destructive/30',
          icon: AlertTriangle
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-muted text-muted-foreground',
          icon: Minus
        };
    }
  };

  const getUrgencyColor = () => {
    if (urgencyScore >= 90) return 'bg-destructive';
    if (urgencyScore >= 70) return 'bg-yellow-500';
    if (urgencyScore >= 50) return 'bg-blue-500';
    return 'bg-muted-foreground/30';
  };

  const badge = getVelocityBadge();
  const IconComponent = badge.icon;

  if (!velocityCategory) {
    return (
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
          No data
        </Badge>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={badge.variant} className={cn('text-xs', badge.className)}>
          <IconComponent className="w-3 h-3 mr-1" />
          {velocityCategory}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      {/* Velocity Category Badge */}
      <Badge variant={badge.variant} className={cn('text-xs w-fit', badge.className)}>
        <IconComponent className="w-3 h-3 mr-1" />
        {velocityCategory}
      </Badge>
      
      {/* Sales Rate & Stock Days */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="font-medium">{salesVelocity.toFixed(1)}/mo</span>
        {stockDaysRemaining !== null && (
          <>
            <span>•</span>
            <span className={cn(
              stockDaysRemaining <= 7 ? 'text-destructive font-semibold' :
              stockDaysRemaining <= 14 ? 'text-yellow-600 dark:text-yellow-500' : ''
            )}>
              {stockDaysRemaining}d left
            </span>
          </>
        )}
      </div>

      {/* Urgency Bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn('h-full rounded-full transition-all', getUrgencyColor())}
            style={{ width: `${Math.min(urgencyScore, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-6 text-right">
          {urgencyScore}%
        </span>
      </div>
    </div>
  );
}
