import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniSparkline } from './MiniSparkline';

export type MetricColor = 'blue' | 'green' | 'red' | 'orange' | 'yellow' | 'purple' | 'pink' | 'cyan' | 'teal' | 'emerald';

interface TrendData {
  value: number;
  isPositive: boolean;
  label?: string;
}

interface ProgressData {
  value: number;
  max: number;
  showPercentage?: boolean;
}

export interface AdvancedMetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  color: MetricColor;
  trend?: TrendData;
  progress?: ProgressData;
  sparklineData?: number[];
  onClick?: () => void;
  badge?: string;
  size?: 'default' | 'hero';
  className?: string;
}

const colorStyles: Record<MetricColor, { border: string; text: string; bg: string; progressBg: string }> = {
  blue: {
    border: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    progressBg: 'bg-blue-500'
  },
  green: {
    border: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    progressBg: 'bg-emerald-500'
  },
  red: {
    border: 'border-l-red-500',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    progressBg: 'bg-red-500'
  },
  orange: {
    border: 'border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    progressBg: 'bg-orange-500'
  },
  yellow: {
    border: 'border-l-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500/10',
    progressBg: 'bg-yellow-500'
  },
  purple: {
    border: 'border-l-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    progressBg: 'bg-purple-500'
  },
  pink: {
    border: 'border-l-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-500/10',
    progressBg: 'bg-pink-500'
  },
  cyan: {
    border: 'border-l-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    progressBg: 'bg-cyan-500'
  },
  teal: {
    border: 'border-l-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10',
    progressBg: 'bg-teal-500'
  },
  emerald: {
    border: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    progressBg: 'bg-emerald-500'
  }
};

// Animated number component
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

export const AdvancedMetricCard: React.FC<AdvancedMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  progress,
  sparklineData,
  onClick,
  badge,
  size = 'default',
  className
}) => {
  const styles = colorStyles[color];
  const isHero = size === 'hero';
  const percentage = progress ? Math.round((progress.value / progress.max) * 100) : null;

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]',
        'border-2 hover:border-primary/30 bg-gradient-to-br from-card to-background',
        'flex flex-col border-l-4',
        styles.border,
        isHero ? 'h-32' : 'h-24',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </CardTitle>
            {badge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          <div className={cn('font-bold mt-1 flex items-center gap-2', styles.text, isHero ? 'text-2xl' : 'text-xl')}>
            <AnimatedNumber value={value} />
            {trend && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0 gap-0.5',
                  trend.isPositive ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-red-600 border-red-200 bg-red-50'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend.value === 0 ? (
                  <Minus className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend.value).toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', styles.bg)}>
            <Icon className={cn('h-4 w-4', styles.text)} />
          </div>
          {sparklineData && sparklineData.length > 0 && (
            <MiniSparkline data={sparklineData} color={color} width={60} height={20} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2 flex-shrink-0 space-y-1">
        {progress && (
          <div className="space-y-1">
            <Progress 
              value={percentage || 0} 
              className="h-1.5"
              style={{ 
                '--progress-background': `var(--${color === 'green' ? 'emerald' : color})` 
              } as React.CSSProperties}
            />
            {progress.showPercentage && (
              <span className="text-[10px] text-muted-foreground">{percentage}%</span>
            )}
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};
