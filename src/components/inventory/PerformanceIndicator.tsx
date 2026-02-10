import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
    last_sale_date: string | null;
  } | null;
}

const categoryConfig = {
  Excellent: { borderColor: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  Good: { borderColor: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  Average: { borderColor: 'border-amber-500', text: 'text-amber-600 dark:text-amber-500' },
  Poor: { borderColor: 'border-red-400', text: 'text-red-500 dark:text-red-400' },
  'No Sales': { borderColor: 'border-muted-foreground/30', text: 'text-muted-foreground' },
};

const TrendArrow = ({ v7d, v30d }: { v7d: number; v30d: number }) => {
  if (v30d === 0 && v7d === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
  const ratio = v30d > 0 ? v7d / v30d : v7d > 0 ? 2 : 1;
  if (ratio > 1.15) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (ratio < 0.85) return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
      <span className="text-[11px] font-semibold tabular-nums leading-none">{value}</span>
    </div>
  );
}

function PerformanceMetrics({ performanceData, category, borderColor, textColor }: {
  performanceData: NonNullable<PerformanceIndicatorProps['performanceData']>;
  category: string;
  borderColor: string;
  textColor: string;
}) {
  const d = performanceData;
  return (
    <div className={cn('border-l-2 pl-2 py-0.5 min-w-[110px] space-y-1', borderColor)}>
      <span className={cn('text-[10px] font-semibold leading-none', textColor)}>{category}</span>
      <MetricRow label="Restocked" value={String(d.total_units_restocked)} />
      <MetricRow label="Sold" value={String(d.total_units_sold_lifetime)} />
      <MetricRow label="In Stock" value={`${d.days_in_inventory}d`} />
      <MetricRow label="Avg Sellout" value={d.avg_days_to_sellout > 0 ? `${Math.round(d.avg_days_to_sellout)}d` : '—'} />
      <MetricRow label="Last Sold" value={d.last_sale_date ? new Date(d.last_sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
    </div>
  );
}

export function PerformanceIndicator({ velocityCategory, performanceData }: PerformanceIndicatorProps) {
  if (!performanceData && !velocityCategory) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    );
  }

  if (!performanceData) {
    const legacyMap: Record<string, string> = {
      'Fast Moving': 'Excellent',
      'Medium Moving': 'Good',
      'Slow Moving': 'Average',
      'No Sales': 'No Sales',
    };
    const category = legacyMap[velocityCategory || ''] || 'No Sales';
    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig['No Sales'];
    return (
      <div className={cn('border-l-2 pl-2 py-0.5 min-w-[110px] space-y-1', config.borderColor)}>
        <span className={cn('text-[10px] font-semibold leading-none', config.text)}>{category}</span>
        <MetricRow label="Restocked" value="—" />
        <MetricRow label="Sold" value="—" />
        <MetricRow label="In Stock" value="—" />
        <MetricRow label="Avg Sellout" value="—" />
        <MetricRow label="Last Sold" value="—" />
      </div>
    );
  }

  const d = performanceData;
  const config = categoryConfig[d.performance_category] || categoryConfig['No Sales'];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <PerformanceMetrics
              performanceData={d}
              category={d.performance_category}
              borderColor={config.borderColor}
              textColor={config.text}
            />
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
                {d.performance_score}/100
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

              <span className="text-muted-foreground">Last Sold</span>
              <span className="font-medium text-right tabular-nums">
                {d.last_sale_date ? new Date(d.last_sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </span>
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
