import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass: string;
  onClick?: () => void;
}

export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  colorClass,
  onClick
}) => {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        onClick && "cursor-pointer",
        `border-l-${colorClass} bg-gradient-to-br from-${colorClass}/5 to-background`
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Icon className={cn("h-5 w-5", `text-${colorClass}`)} />
            {trend && (
              <div className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground leading-none">{title}</p>
            <p className="text-3xl font-bold tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
