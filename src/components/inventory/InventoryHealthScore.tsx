import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InventoryHealthScoreProps {
  score: number;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  className?: string;
}

export const InventoryHealthScore: React.FC<InventoryHealthScoreProps> = ({
  score,
  trend,
  onClick,
  className
}) => {
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return { stroke: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Excellent' };
    if (score >= 60) return { stroke: '#eab308', bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Good' };
    if (score >= 40) return { stroke: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Fair' };
    return { stroke: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-600', label: 'Needs Attention' };
  };

  const colorInfo = getScoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]',
        'border-2 hover:border-primary/30 bg-gradient-to-br from-card to-background',
        'flex flex-col h-32',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-center p-4 h-full gap-4">
        {/* Circular Progress */}
        <div className="relative">
          <svg width="90" height="90" viewBox="0 0 100 100" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={colorInfo.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Score in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold', colorInfo.text)}>{score}</span>
            <span className="text-[9px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Info section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', colorInfo.bg)}>
              <Heart className={cn('h-3 w-3', colorInfo.text)} />
            </div>
            <span className="text-sm font-semibold">Health Score</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn('text-[10px] w-fit', colorInfo.text)}
          >
            {colorInfo.label}
          </Badge>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              ) : trend.value === 0 ? (
                <Minus className="w-3 h-3 text-muted-foreground" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={cn('text-[10px]', trend.isPositive ? 'text-emerald-600' : 'text-red-600')}>
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}% vs last week
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to calculate health score
export const calculateHealthScore = (metrics: {
  inStockCount: number;
  outOfStockCount: number;
  missingSku: number;
  missingTitle: number;
  missingImages: number;
  totalAsins: number;
  restockEligible: number;
}): number => {
  if (metrics.totalAsins === 0) return 100;

  // Stock availability (40% weight)
  const stockScore = (metrics.inStockCount / metrics.totalAsins) * 40;

  // Data completeness (40% weight)
  const totalDataIssues = metrics.missingSku + metrics.missingTitle + metrics.missingImages;
  const maxPossibleIssues = metrics.totalAsins * 3;
  const dataCompleteness = maxPossibleIssues > 0 
    ? ((maxPossibleIssues - totalDataIssues) / maxPossibleIssues) * 40 
    : 40;

  // Restock readiness (20% weight) - penalize if too many items need restocking
  const outOfStockRatio = metrics.totalAsins > 0 ? metrics.outOfStockCount / metrics.totalAsins : 0;
  const restockScore = Math.max(0, (1 - outOfStockRatio * 2)) * 20;

  return Math.round(Math.min(100, stockScore + dataCompleteness + restockScore));
};
