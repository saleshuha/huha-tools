import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Clock, Flame, Package, BarChart3, Timer } from 'lucide-react';
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

export function PerformanceIndicator({
  velocityCategory,
  salesVelocity = 0,
  stockDaysRemaining,
  urgencyScore = 0,
  compact = false,
  performanceData
}: PerformanceIndicatorProps) {
  // Use performanceData if available, otherwise fall back to legacy props
  const data = performanceData ? {
    totalSold: performanceData.total_units_sold_lifetime,
    totalRestocked: performanceData.total_units_restocked,
    daysInInventory: performanceData.days_in_inventory,
    avgSelloutDays: performanceData.avg_days_to_sellout,
    velocity7d: performanceData.sales_velocity_7d,
    velocity30d: performanceData.sales_velocity_30d,
    velocity90d: performanceData.sales_velocity_90d,
    velocityLifetime: performanceData.sales_velocity_lifetime,
    score: performanceData.performance_score,
    category: performanceData.performance_category,
    stockDays: performanceData.stock_days_remaining,
    turnover: performanceData.turnover_ratio
  } : null;

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'Excellent':
        return {
          gradient: 'from-emerald-500 to-green-600',
          bgGlow: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          icon: Flame,
          label: 'Excellent',
          emoji: '🔥'
        };
      case 'Good':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          bgGlow: 'bg-blue-500/10',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: Zap,
          label: 'Good',
          emoji: '⚡'
        };
      case 'Average':
        return {
          gradient: 'from-amber-500 to-orange-600',
          bgGlow: 'bg-amber-500/10',
          borderColor: 'border-amber-500/40',
          textColor: 'text-amber-600 dark:text-amber-500',
          icon: TrendingUp,
          label: 'Average',
          emoji: '📊'
        };
      case 'Poor':
        return {
          gradient: 'from-red-400 to-red-500',
          bgGlow: 'bg-red-500/10',
          borderColor: 'border-red-500/40',
          textColor: 'text-red-600 dark:text-red-400',
          icon: Clock,
          label: 'Poor',
          emoji: '🐢'
        };
      case 'No Sales':
        return {
          gradient: 'from-gray-400 to-gray-500',
          bgGlow: 'bg-muted',
          borderColor: 'border-border',
          textColor: 'text-muted-foreground',
          icon: AlertTriangle,
          label: 'No Sales',
          emoji: '⏸️'
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-500',
          bgGlow: 'bg-muted',
          borderColor: 'border-border',
          textColor: 'text-muted-foreground',
          icon: Minus,
          label: 'N/A',
          emoji: '—'
        };
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-green-500';
    if (score >= 60) return 'from-blue-500 to-indigo-500';
    if (score >= 40) return 'from-amber-500 to-orange-500';
    if (score >= 20) return 'from-orange-500 to-red-400';
    return 'from-gray-400 to-gray-500';
  };

  const getStockDaysColor = (days: number | null) => {
    if (days === null) return 'text-muted-foreground';
    if (days <= 7) return 'text-red-500 font-bold';
    if (days <= 14) return 'text-amber-500 font-semibold';
    if (days <= 30) return 'text-blue-500';
    return 'text-emerald-500';
  };

  const formatVelocity = (velocity: number) => {
    return velocity.toFixed(2);
  };

  // No data available
  if (!data && !velocityCategory) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
          <Minus className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">No data</span>
        </div>
      </div>
    );
  }

  // Use new comprehensive data if available
  if (data) {
    const config = getCategoryConfig(data.category);
    const IconComponent = config.icon;

    if (compact) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-help transition-all hover:scale-105',
                config.bgGlow, config.borderColor
              )}>
                <IconComponent className={cn('w-3.5 h-3.5', config.textColor)} />
                <span className={cn('text-xs font-medium', config.textColor)}>{config.label}</span>
                <span className="text-[10px] text-muted-foreground">({data.totalSold})</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover border shadow-lg">
              <div className="text-xs space-y-1">
                <p className="font-medium">{data.category} Performer</p>
                <p className="text-muted-foreground">{data.totalSold} units sold lifetime</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex flex-col gap-1.5 p-2 rounded-lg border cursor-help transition-all duration-200',
              'hover:shadow-md hover:scale-[1.02]',
              config.bgGlow, config.borderColor
            )}>
              {/* Category Badge + Total Sold */}
              <div className="flex items-center justify-between gap-2">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full',
                  'bg-gradient-to-r', config.gradient, 'text-white shadow-sm'
                )}>
                  <IconComponent className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">{config.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] font-bold">{data.totalSold}</span>
                  <span className="text-[9px] text-muted-foreground">sold</span>
                </div>
              </div>

              {/* Velocity Breakdown */}
              <div className="flex items-center justify-between text-[10px] bg-muted/30 rounded px-1.5 py-0.5">
                <span className="text-muted-foreground">Speed:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-medium text-foreground">{formatVelocity(data.velocity30d)}</span>
                  <span className="text-muted-foreground">/day</span>
                </div>
              </div>

              {/* Stock Days + Avg Sellout */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-0.5">
                  <Timer className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Stock:</span>
                </div>
                <span className={cn('font-medium', getStockDaysColor(data.stockDays))}>
                  {data.stockDays !== null ? `${Math.round(data.stockDays)}d` : '∞'}
                </span>
              </div>

              {/* Performance Score Bar */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-muted-foreground uppercase tracking-wider">Score</span>
                  <span className={cn(
                    'font-bold',
                    data.score >= 80 ? 'text-emerald-500' :
                    data.score >= 60 ? 'text-blue-500' :
                    data.score >= 40 ? 'text-amber-500' : 
                    data.score >= 20 ? 'text-orange-500' : 'text-gray-500'
                  )}>
                    {data.score}%
                  </span>
                </div>
                <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                      'bg-gradient-to-r', getScoreBarColor(data.score)
                    )}
                    style={{ width: `${Math.min(data.score, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-popover border shadow-xl max-w-sm" sideOffset={5}>
            <div className="space-y-3 p-1">
              {/* Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  'bg-gradient-to-br', config.gradient
                )}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{config.emoji} {data.category} Performer</p>
                  <p className="text-xs text-muted-foreground">
                    In inventory for {data.daysInInventory} days
                  </p>
                </div>
              </div>

              {/* Lifetime Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Sold</p>
                  <p className="text-lg font-bold">{data.totalSold}</p>
                  <p className="text-[10px] text-muted-foreground">units lifetime</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Restocked</p>
                  <p className="text-lg font-bold">{data.totalRestocked}</p>
                  <p className="text-[10px] text-muted-foreground">units total</p>
                </div>
              </div>

              {/* Velocity Breakdown */}
              <div className="bg-muted/30 rounded p-2 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Selling Speed</p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div>
                    <p className="text-xs font-bold">{formatVelocity(data.velocity7d)}</p>
                    <p className="text-[9px] text-muted-foreground">7d</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{formatVelocity(data.velocity30d)}</p>
                    <p className="text-[9px] text-muted-foreground">30d</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{formatVelocity(data.velocity90d)}</p>
                    <p className="text-[9px] text-muted-foreground">90d</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{formatVelocity(data.velocityLifetime)}</p>
                    <p className="text-[9px] text-muted-foreground">All</p>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-muted-foreground text-[10px]">Avg Sellout Time</p>
                  <p className="font-bold">
                    {data.avgSelloutDays > 0 ? `${Math.round(data.avgSelloutDays)} days` : 'N/A'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-muted-foreground text-[10px]">Turnover Ratio</p>
                  <p className="font-bold">{(data.turnover * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-muted-foreground text-[10px]">Stock Days Left</p>
                  <p className={cn('font-bold', getStockDaysColor(data.stockDays))}>
                    {data.stockDays !== null ? `${Math.round(data.stockDays)} days` : 'N/A'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-muted-foreground text-[10px]">Performance Score</p>
                  <div className="flex items-center gap-1">
                    <p className={cn('font-bold', 
                      data.score >= 80 ? 'text-emerald-500' :
                      data.score >= 60 ? 'text-blue-500' :
                      data.score >= 40 ? 'text-amber-500' : 'text-red-500'
                    )}>{data.score}%</p>
                    <BarChart3 className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Fallback to legacy display
  const getLegacyConfig = () => {
    switch (velocityCategory) {
      case 'Fast Moving':
        return {
          gradient: 'from-emerald-500 to-green-600',
          bgGlow: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          icon: Flame,
          label: 'Fast'
        };
      case 'Medium Moving':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          bgGlow: 'bg-blue-500/10',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: Zap,
          label: 'Medium'
        };
      case 'Slow Moving':
        return {
          gradient: 'from-amber-500 to-orange-600',
          bgGlow: 'bg-amber-500/10',
          borderColor: 'border-amber-500/40',
          textColor: 'text-amber-600 dark:text-amber-500',
          icon: Clock,
          label: 'Slow'
        };
      case 'No Sales':
        return {
          gradient: 'from-red-500 to-rose-600',
          bgGlow: 'bg-red-500/10',
          borderColor: 'border-red-500/40',
          textColor: 'text-red-600 dark:text-red-400',
          icon: AlertTriangle,
          label: 'No Sales'
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-500',
          bgGlow: 'bg-muted',
          borderColor: 'border-border',
          textColor: 'text-muted-foreground',
          icon: Minus,
          label: 'N/A'
        };
    }
  };

  const config = getLegacyConfig();
  const IconComponent = config.icon;

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-md border',
      config.bgGlow, config.borderColor
    )}>
      <IconComponent className={cn('w-3.5 h-3.5', config.textColor)} />
      <span className={cn('text-xs font-medium', config.textColor)}>{config.label}</span>
    </div>
  );
}
