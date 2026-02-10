import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface PerformanceIndicatorProps {
  velocityCategory?: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales' | null;
  salesVelocity?: number;
  stockDaysRemaining?: number | null;
  urgencyScore?: number;
  compact?: boolean;
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

const categoryConfig = {
  Excellent: { color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', letter: 'E' },
  Good: { color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300', letter: 'G' },
  Average: { color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', letter: 'A' },
  Poor: { color: 'bg-red-400', text: 'text-red-500 dark:text-red-400', badge: 'bg-red-500/15 text-red-700 dark:text-red-300', letter: 'P' },
  'No Sales': { color: 'bg-muted-foreground/30', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground', letter: '–' },
};

const ScoreBar = ({ score, category }: { score: number; category: string }) => {
  const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig['No Sales'];
  return (
    <div className="w-full flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', config.color)}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={cn('text-[10px] font-semibold tabular-nums leading-none', config.text)}>
        {score}
      </span>
    </div>
  );
};

const VelocityTrendBars = ({ v7d, v30d, v90d }: { v7d: number; v30d: number; v90d: number }) => {
  const max = Math.max(v7d, v30d, v90d, 0.01);
  const bars = [
    { label: '7d', value: v7d },
    { label: '30d', value: v30d },
    { label: '90d', value: v90d },
  ];

  return (
    <div className="flex items-end gap-1">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-0.5">
          <div className="w-3 bg-muted rounded-sm overflow-hidden" style={{ height: 12 }}>
            <div
              className="w-full bg-primary/60 rounded-sm transition-all"
              style={{ height: `${(b.value / max) * 100}%`, marginTop: `${100 - (b.value / max) * 100}%` }}
            />
          </div>
          <span className="text-[8px] text-muted-foreground leading-none">{b.label}</span>
        </div>
      ))}
    </div>
  );
};

const TrendArrow = ({ v7d, v30d }: { v7d: number; v30d: number }) => {
  if (v30d === 0 && v7d === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  const ratio = v30d > 0 ? v7d / v30d : v7d > 0 ? 2 : 1;
  if (ratio > 1.15) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (ratio < 0.85) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

const RunwayBadge = ({ days }: { days: number | null }) => {
  if (days === null) return <span className="text-[10px] text-muted-foreground">∞</span>;
  const rounded = Math.round(days);
  if (rounded < 7) return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500">
      <AlertTriangle className="w-2.5 h-2.5" />{rounded}d
    </span>
  );
  if (rounded < 30) return <span className="text-[10px] font-medium text-amber-500">{rounded}d</span>;
  return <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{rounded}d</span>;
};

export function PerformanceIndicator({ velocityCategory, performanceData }: PerformanceIndicatorProps) {
  if (!performanceData && !velocityCategory) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    );
  }

  if (!performanceData) {
    // Legacy fallback
    const legacyMap: Record<string, { letter: string; score: number; category: string }> = {
      'Fast Moving': { letter: 'F', score: 80, category: 'Excellent' },
      'Medium Moving': { letter: 'M', score: 60, category: 'Good' },
      'Slow Moving': { letter: 'S', score: 40, category: 'Average' },
      'No Sales': { letter: '–', score: 10, category: 'No Sales' },
    };
    const legacy = legacyMap[velocityCategory || ''] || { letter: '–', score: 0, category: 'No Sales' };
    const config = categoryConfig[legacy.category as keyof typeof categoryConfig] || categoryConfig['No Sales'];
    return (
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="flex-1">
          <ScoreBar score={legacy.score} category={legacy.category} />
        </div>
        <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded', config.badge)}>{legacy.letter}</span>
      </div>
    );
  }

  const d = performanceData;
  const config = categoryConfig[d.performance_category] || categoryConfig['No Sales'];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-start gap-1.5 cursor-help min-w-[100px]">
            {/* Main stack */}
            <div className="flex-1 flex flex-col gap-1 py-0.5">
              {/* Score bar */}
              <ScoreBar score={d.performance_score} category={d.performance_category} />
              {/* Velocity + runway */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-0.5">
                  <TrendArrow v7d={d.sales_velocity_7d} v30d={d.sales_velocity_30d} />
                  <span className="text-[10px] tabular-nums text-foreground/80">
                    {d.sales_velocity_30d.toFixed(1)}/d
                  </span>
                </div>
                <RunwayBadge days={d.stock_days_remaining} />
              </div>
              {/* Velocity trend bars */}
              <VelocityTrendBars v7d={d.sales_velocity_7d} v30d={d.sales_velocity_30d} v90d={d.sales_velocity_90d} />
            </div>
            {/* Category badge */}
            <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded leading-none mt-0.5', config.badge)}>
              {config.letter}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border shadow-lg p-3 max-w-[260px]">
          <div className="space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className={cn('font-semibold text-sm', config.text)}>
                {d.performance_category}
              </span>
              <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded tabular-nums">
                {d.performance_score}%
              </span>
            </div>

            {/* Trend */}
            <div className="flex items-center gap-1.5 text-xs">
              <TrendArrow v7d={d.sales_velocity_7d} v30d={d.sales_velocity_30d} />
              <span className="text-muted-foreground">
                {d.sales_velocity_7d > d.sales_velocity_30d * 1.15
                  ? 'Trending up (7d > 30d)'
                  : d.sales_velocity_7d < d.sales_velocity_30d * 0.85
                    ? 'Trending down (7d < 30d)'
                    : 'Stable trend'}
              </span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">Total Sold</span>
              <span className="font-medium text-right tabular-nums">{d.total_units_sold_lifetime}</span>

              <span className="text-muted-foreground">Restocked</span>
              <span className="font-medium text-right tabular-nums">{d.total_units_restocked}</span>

              <span className="text-muted-foreground">Days in Inv.</span>
              <span className="font-medium text-right tabular-nums">{d.days_in_inventory}d</span>

              <span className="text-muted-foreground">Avg Sellout</span>
              <span className="font-medium text-right tabular-nums">
                {d.avg_days_to_sellout > 0 ? `${Math.round(d.avg_days_to_sellout)}d` : '—'}
              </span>

              <span className="text-muted-foreground">Stock Left</span>
              <span className="font-medium text-right tabular-nums">
                {d.stock_days_remaining !== null ? `${Math.round(d.stock_days_remaining)}d` : '∞'}
              </span>

              <span className="text-muted-foreground">Turnover</span>
              <span className="font-medium text-right tabular-nums">{(d.turnover_ratio * 100).toFixed(0)}%</span>
            </div>

            {/* Velocity breakdown */}
            <div className="border-t border-border pt-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Velocity</span>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { label: '7d', value: d.sales_velocity_7d },
                  { label: '30d', value: d.sales_velocity_30d },
                  { label: '90d', value: d.sales_velocity_90d },
                ].map((v) => (
                  <div key={v.label} className="text-center">
                    <div className="text-xs font-semibold tabular-nums">{v.value.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">/day ({v.label})</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
