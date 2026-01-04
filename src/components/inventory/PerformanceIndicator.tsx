import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PerformanceIndicatorProps {
  // Legacy props for backward compatibility
  velocityCategory?: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales' | null;
  salesVelocity?: number;
  stockDaysRemaining?: number | null;
  urgencyScore?: number;
  compact?: boolean;
  // New comprehensive performance props
  performanceData?: {
    total_units_sold_lifetime: number;
    total_units_restocked: number;
    days_in_inventory: number;
    avg_days_to_sellout: number;
    sales_velocity_7d: number;
    sales_velocity_30d: number;
    sales_velocity_90d: number;
    sales_velocity_lifetime: number;
    performance_score: number;
    performance_category: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'No Sales';
    stock_days_remaining: number | null;
    turnover_ratio: number;
  } | null;
}

// Simple dot rating component
const DotRating = ({ score, category }: { score: number; category: string }) => {
  // Convert score (0-100) to dots (0-5)
  const filledDots = Math.round(score / 20);
  
  const getDotColor = () => {
    switch (category) {
      case 'Excellent': return 'bg-emerald-500';
      case 'Good': return 'bg-blue-500';
      case 'Average': return 'bg-amber-500';
      case 'Poor': return 'bg-red-400';
      default: return 'bg-muted-foreground/30';
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((dot) => (
        <div
          key={dot}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            dot <= filledDots ? getDotColor() : 'bg-muted-foreground/20'
          )}
        />
      ))}
    </div>
  );
};

export function PerformanceIndicator({
  velocityCategory,
  performanceData
}: PerformanceIndicatorProps) {
  // Map performanceData if available
  const data = performanceData ? {
    totalSold: performanceData.total_units_sold_lifetime,
    totalRestocked: performanceData.total_units_restocked,
    daysInInventory: performanceData.days_in_inventory,
    velocity30d: performanceData.sales_velocity_30d,
    score: performanceData.performance_score,
    category: performanceData.performance_category,
    stockDays: performanceData.stock_days_remaining,
    turnover: performanceData.turnover_ratio
  } : null;

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'Excellent':
        return { text: 'text-emerald-600 dark:text-emerald-400', label: 'Excellent' };
      case 'Good':
        return { text: 'text-blue-600 dark:text-blue-400', label: 'Good' };
      case 'Average':
        return { text: 'text-amber-600 dark:text-amber-500', label: 'Average' };
      case 'Poor':
        return { text: 'text-red-500 dark:text-red-400', label: 'Poor' };
      case 'No Sales':
        return { text: 'text-muted-foreground', label: 'No Sales' };
      default:
        return { text: 'text-muted-foreground', label: 'N/A' };
    }
  };

  // No data available
  if (!data && !velocityCategory) {
    return (
      <div className="flex items-center gap-1.5">
        <DotRating score={0} category="none" />
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    );
  }

  // Use comprehensive data if available
  if (data) {
    const style = getCategoryStyle(data.category);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <DotRating score={data.score} category={data.category} />
              <span className={cn('text-xs font-medium', style.text)}>
                {style.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({data.totalSold})
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border shadow-lg p-3 max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className={cn('font-semibold text-sm', style.text)}>
                  {style.label} Performance
                </span>
                <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded">
                  {data.score}%
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-muted-foreground">Total Sold:</div>
                <div className="font-medium text-right">{data.totalSold} units</div>
                
                <div className="text-muted-foreground">Velocity:</div>
                <div className="font-medium text-right">{data.velocity30d.toFixed(2)}/day</div>
                
                <div className="text-muted-foreground">Stock Days:</div>
                <div className="font-medium text-right">
                  {data.stockDays !== null ? `${Math.round(data.stockDays)}d` : '∞'}
                </div>
                
                <div className="text-muted-foreground">Turnover:</div>
                <div className="font-medium text-right">{(data.turnover * 100).toFixed(0)}%</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Fallback to legacy display
  const getLegacyStyle = () => {
    switch (velocityCategory) {
      case 'Fast Moving':
        return { text: 'text-emerald-600 dark:text-emerald-400', label: 'Fast', score: 80 };
      case 'Medium Moving':
        return { text: 'text-blue-600 dark:text-blue-400', label: 'Medium', score: 60 };
      case 'Slow Moving':
        return { text: 'text-amber-600 dark:text-amber-500', label: 'Slow', score: 40 };
      case 'No Sales':
        return { text: 'text-red-500 dark:text-red-400', label: 'No Sales', score: 10 };
      default:
        return { text: 'text-muted-foreground', label: 'N/A', score: 0 };
    }
  };

  const legacyStyle = getLegacyStyle();

  return (
    <div className="flex items-center gap-2">
      <DotRating score={legacyStyle.score} category={velocityCategory || 'none'} />
      <span className={cn('text-xs font-medium', legacyStyle.text)}>
        {legacyStyle.label}
      </span>
    </div>
  );
}
