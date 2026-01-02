import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Clock, Target, Flame } from 'lucide-react';
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
  const getVelocityConfig = () => {
    switch (velocityCategory) {
      case 'Fast Moving':
        return {
          gradient: 'from-emerald-500 to-green-600',
          bgGlow: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          icon: Flame,
          label: 'Fast',
          description: 'High demand product'
        };
      case 'Medium Moving':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          bgGlow: 'bg-blue-500/10',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: Zap,
          label: 'Medium',
          description: 'Steady sales performance'
        };
      case 'Slow Moving':
        return {
          gradient: 'from-amber-500 to-orange-600',
          bgGlow: 'bg-amber-500/10',
          borderColor: 'border-amber-500/40',
          textColor: 'text-amber-600 dark:text-amber-500',
          icon: Clock,
          label: 'Slow',
          description: 'Low sales velocity'
        };
      case 'No Sales':
        return {
          gradient: 'from-red-500 to-rose-600',
          bgGlow: 'bg-red-500/10',
          borderColor: 'border-red-500/40',
          textColor: 'text-red-600 dark:text-red-400',
          icon: AlertTriangle,
          label: 'No Sales',
          description: 'No recent sales activity'
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-500',
          bgGlow: 'bg-muted',
          borderColor: 'border-border',
          textColor: 'text-muted-foreground',
          icon: Minus,
          label: 'N/A',
          description: 'No performance data'
        };
    }
  };

  const getUrgencyConfig = () => {
    if (urgencyScore >= 90) return { 
      color: 'bg-gradient-to-r from-red-500 to-rose-600', 
      glow: 'shadow-red-500/50',
      label: 'Critical',
      pulse: true 
    };
    if (urgencyScore >= 70) return { 
      color: 'bg-gradient-to-r from-amber-500 to-orange-500', 
      glow: 'shadow-amber-500/50',
      label: 'High',
      pulse: false 
    };
    if (urgencyScore >= 50) return { 
      color: 'bg-gradient-to-r from-blue-500 to-indigo-500', 
      glow: 'shadow-blue-500/30',
      label: 'Medium',
      pulse: false 
    };
    return { 
      color: 'bg-gradient-to-r from-slate-400 to-slate-500', 
      glow: '',
      label: 'Low',
      pulse: false 
    };
  };

  const getStockDaysConfig = () => {
    if (stockDaysRemaining === null) return { color: 'text-muted-foreground', icon: null };
    if (stockDaysRemaining <= 7) return { color: 'text-red-500 font-bold', icon: '🔥' };
    if (stockDaysRemaining <= 14) return { color: 'text-amber-500 font-semibold', icon: '⚠️' };
    if (stockDaysRemaining <= 30) return { color: 'text-blue-500', icon: null };
    return { color: 'text-emerald-500', icon: '✓' };
  };

  const config = getVelocityConfig();
  const urgencyConfig = getUrgencyConfig();
  const stockConfig = getStockDaysConfig();
  const IconComponent = config.icon;

  if (!velocityCategory) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
          <Minus className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">No data</span>
        </div>
      </div>
    );
  }

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
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border shadow-lg">
            <div className="text-xs space-y-1">
              <p className="font-medium">{velocityCategory}</p>
              <p className="text-muted-foreground">{salesVelocity.toFixed(1)} sales/month</p>
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
            'flex flex-col gap-2 p-2 rounded-lg border cursor-help transition-all duration-200',
            'hover:shadow-md hover:scale-[1.02]',
            config.bgGlow, config.borderColor
          )}>
            {/* Velocity Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full',
                'bg-gradient-to-r', config.gradient, 'text-white shadow-sm'
              )}>
                <IconComponent className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{config.label}</span>
              </div>
              
              {/* Mini Stats */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span className="font-mono font-medium">{salesVelocity.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Stock Days */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                Stock:
              </span>
              <span className={cn('font-medium', stockConfig.color)}>
                {stockConfig.icon && <span className="mr-0.5">{stockConfig.icon}</span>}
                {stockDaysRemaining !== null ? `${stockDaysRemaining}d` : 'N/A'}
              </span>
            </div>

            {/* Urgency Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground uppercase tracking-wider">Urgency</span>
                <span className={cn(
                  'font-bold',
                  urgencyScore >= 90 ? 'text-red-500' :
                  urgencyScore >= 70 ? 'text-amber-500' :
                  urgencyScore >= 50 ? 'text-blue-500' : 'text-muted-foreground'
                )}>
                  {urgencyConfig.label}
                </span>
              </div>
              <div className="relative h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                    urgencyConfig.color,
                    urgencyConfig.pulse && 'animate-pulse'
                  )}
                  style={{ width: `${Math.min(urgencyScore, 100)}%` }}
                />
                {/* Glow effect for high urgency */}
                {urgencyScore >= 70 && (
                  <div 
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full blur-sm opacity-50',
                      urgencyConfig.color
                    )}
                    style={{ width: `${Math.min(urgencyScore, 100)}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-popover border shadow-xl max-w-xs">
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br', config.gradient
              )}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{velocityCategory}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 rounded p-1.5">
                <p className="text-muted-foreground">Sales Rate</p>
                <p className="font-bold">{salesVelocity.toFixed(1)}/month</p>
              </div>
              <div className="bg-muted/50 rounded p-1.5">
                <p className="text-muted-foreground">Stock Days</p>
                <p className="font-bold">{stockDaysRemaining ?? 'N/A'}</p>
              </div>
              <div className="bg-muted/50 rounded p-1.5 col-span-2">
                <p className="text-muted-foreground">Urgency Score</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{urgencyScore}%</p>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    urgencyScore >= 90 ? 'bg-red-500/20 text-red-500' :
                    urgencyScore >= 70 ? 'bg-amber-500/20 text-amber-500' :
                    urgencyScore >= 50 ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'
                  )}>
                    {urgencyConfig.label} Priority
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
