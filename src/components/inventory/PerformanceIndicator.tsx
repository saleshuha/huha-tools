import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface PerformanceIndicatorProps {
  velocityCategory?: 'Fast Moving' | 'Medium Moving' | 'Slow Moving' | 'No Sales' | null;
  salesVelocity?: number;
  stockDaysRemaining?: number | null;
  urgencyScore?: number;
  compact?: boolean;
  performanceData?: {
    total_units_sold_lifetime: number;
    total_units_restocked: number;
    po_units_sold: number;
    b2b_units_sold: number;
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

const scoreColor = (score: number) => {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-blue-500';
  if (score >= 25) return 'bg-amber-500';
  return 'bg-red-400';
};

const categoryTextColor: Record<string, string> = {
  Excellent: 'text-emerald-600 dark:text-emerald-400',
  Good: 'text-blue-600 dark:text-blue-400',
  Average: 'text-amber-600 dark:text-amber-500',
  Poor: 'text-red-500 dark:text-red-400',
  'No Sales': 'text-muted-foreground',
};

function MetricRow({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground leading-none">{label}</span>
      <span className={cn(
        'text-[11px] font-semibold tabular-nums leading-none',
        muted && 'text-muted-foreground font-normal'
      )}>{value}</span>
    </div>
  );
}

function getDaysAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    return (
      <div className="min-w-[120px] space-y-1 py-0.5">
        <MetricRow label="Total Sold" value="—" muted />
        <MetricRow label="Restocked" value="—" muted />
        <MetricRow label="PO Sold" value="—" muted />
        <MetricRow label="B2B Sold" value="—" muted />
        <MetricRow label="Last Sold" value="—" muted />
        <MetricRow label="Days Ago" value="—" muted />
        <div className="pt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-0 rounded-full bg-muted-foreground/30" />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums w-5 text-right">0</span>
          </div>
        </div>
      </div>
    );
  }

  const d = performanceData;
  const textColor = categoryTextColor[d.performance_category] || categoryTextColor['No Sales'];
  const barColor = scoreColor(d.performance_score);

  return (
    <div className="min-w-[120px] space-y-1 py-0.5">
      <MetricRow label="Total Sold" value={d.total_units_sold_lifetime} />
      <MetricRow label="Restocked" value={d.total_units_restocked} />
      <MetricRow label="PO Sold" value={d.po_units_sold} />
      <MetricRow label="B2B Sold" value={d.b2b_units_sold} />
      <MetricRow label="Last Sold" value={formatDate(d.last_sale_date)} />
      <MetricRow label="Days Ago" value={getDaysAgo(d.last_sale_date)} />
      <div className="pt-0.5">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${Math.min(100, d.performance_score)}%` }}
            />
          </div>
          <span className={cn('text-[10px] font-bold tabular-nums w-5 text-right', textColor)}>
            {d.performance_score}
          </span>
        </div>
      </div>
    </div>
  );
}
