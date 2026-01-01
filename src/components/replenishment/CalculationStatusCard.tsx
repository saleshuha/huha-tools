import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Settings, Calculator, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalculationStatusCardProps {
  configName: string | null;
  isCalculating: boolean;
  lastCalculatedAt: Date | null;
  calculationProgress: number;
  totalItems: number;
  calculatedItems: number;
  onRecalculate: () => void;
  onOpenConfig: () => void;
}

export function CalculationStatusCard({
  configName,
  isCalculating,
  lastCalculatedAt,
  calculationProgress,
  totalItems,
  calculatedItems,
  onRecalculate,
  onOpenConfig,
}: CalculationStatusCardProps) {
  const getStatusColor = () => {
    if (isCalculating) return 'bg-blue-500/10 border-blue-500/30';
    if (!configName) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-emerald-500/10 border-emerald-500/30';
  };

  const getStatusIcon = () => {
    if (isCalculating) return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    if (!configName) return <AlertCircle className="w-5 h-5 text-orange-500" />;
    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      getStatusColor()
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Status Section */}
          <div className="flex items-center gap-4 flex-1">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isCalculating ? "bg-blue-500/20" : configName ? "bg-emerald-500/20" : "bg-orange-500/20"
            )}>
              {getStatusIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-muted-foreground">Active Configuration</span>
                {isCalculating && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 text-xs animate-pulse">
                    Calculating...
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold truncate">
                  {configName || 'No configuration selected'}
                </span>
              </div>
              
              {/* Progress bar when calculating */}
              {isCalculating && (
                <div className="mt-2 space-y-1">
                  <Progress value={calculationProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {calculatedItems} of {totalItems} items calculated
                  </p>
                </div>
              )}
              
              {/* Last calculation timestamp */}
              {!isCalculating && lastCalculatedAt && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Last calculated: {format(lastCalculatedAt, 'MMM d, yyyy HH:mm')}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenConfig}
              className="gap-2"
              disabled={isCalculating}
            >
              <Settings className="w-4 h-4" />
              Configure
            </Button>
            <Button
              size="sm"
              onClick={onRecalculate}
              disabled={isCalculating || !configName}
              className={cn(
                "gap-2 min-w-[140px]",
                isCalculating 
                  ? "bg-blue-500 hover:bg-blue-600" 
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isCalculating && "animate-spin")} />
              {isCalculating ? 'Calculating...' : 'Recalculate All'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
