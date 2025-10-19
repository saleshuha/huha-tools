import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface POMetricsCardProps {
  title: string;
  icon: LucideIcon;
  value: number | string;
  subValue?: string;
  percentage?: number;
  onClick?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
  isActive?: boolean;
  colorClass?: string;
  borderColorClass?: string;
  textColorClass?: string;
  tooltipText?: string;
}

export const POMetricsCard: React.FC<POMetricsCardProps> = ({
  title,
  icon: Icon,
  value,
  subValue,
  percentage,
  onClick,
  onExport,
  isLoading,
  isExporting,
  isActive,
  colorClass = 'from-primary/5',
  borderColorClass = 'border-l-primary',
  textColorClass = 'text-primary',
  tooltipText = 'Click to filter table'
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              'relative overflow-hidden border-l-4 bg-gradient-to-br to-background transition-all',
              borderColorClass,
              colorClass,
              onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-md',
              isActive && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={onClick}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className={cn('flex items-center gap-2 text-sm', textColorClass)}>
                  <Icon className="h-4 w-4" />
                  {title}
                </CardTitle>
                {onExport && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport();
                    }}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  value
                )}
              </div>
              {subValue && (
                <div className={cn('text-xs mt-1', textColorClass.replace('text-', 'text-') + '/80')}>
                  {subValue}
                </div>
              )}
              {percentage !== undefined && (
                <div className="mt-2 space-y-1">
                  <Progress value={percentage} className="h-1.5" />
                  <div className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% of total
                  </div>
                </div>
              )}
              {isLoading && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Calculating...
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        {onClick && (
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
