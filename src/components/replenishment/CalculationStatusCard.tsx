import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  Settings, 
  Calculator, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalculationConfig {
  id: string;
  config_name: string;
  calculation_method: string;
  lookback_days: number;
  safety_stock_days: number;
  lead_time_days: number;
  min_order_quantity: number;
  max_order_quantity: number;
  include_sales?: boolean;
  sales_weight?: number;
}

interface CalculationStats {
  edgeSuccessCount: number;
  fallbackCount: number;
  errorCount: number;
  lastError: string | null;
}

interface CalculationStatusCardProps {
  configName: string | null;
  activeConfig?: CalculationConfig | null;
  calculationStats?: CalculationStats;
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
  activeConfig,
  calculationStats,
  isCalculating,
  lastCalculatedAt,
  calculationProgress,
  totalItems,
  calculatedItems,
  onRecalculate,
  onOpenConfig,
}: CalculationStatusCardProps) {
  const getStatusGradient = () => {
    if (isCalculating) return 'from-blue-500/10 via-blue-400/5 to-transparent';
    if (!configName) return 'from-orange-500/10 via-orange-400/5 to-transparent';
    if (calculationStats?.fallbackCount && calculationStats.fallbackCount > 0) {
      return 'from-yellow-500/10 via-yellow-400/5 to-transparent';
    }
    return 'from-emerald-500/10 via-emerald-400/5 to-transparent';
  };

  const getStatusBorder = () => {
    if (isCalculating) return 'border-blue-500/30';
    if (!configName) return 'border-orange-500/30';
    if (calculationStats?.fallbackCount && calculationStats.fallbackCount > 0) {
      return 'border-yellow-500/30';
    }
    return 'border-emerald-500/30';
  };

  const getStatusIcon = () => {
    if (isCalculating) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg animate-pulse" />
          <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Activity className="w-7 h-7 text-white animate-pulse" />
          </div>
        </div>
      );
    }
    if (!configName) {
      return (
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-400/10 flex items-center justify-center border border-orange-500/30">
          <AlertCircle className="w-7 h-7 text-orange-500" />
        </div>
      );
    }
    if (calculationStats?.fallbackCount && calculationStats.fallbackCount > 0) {
      return (
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 flex items-center justify-center border border-yellow-500/30">
          <AlertTriangle className="w-7 h-7 text-yellow-600" />
        </div>
      );
    }
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md" />
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
      </div>
    );
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'simple': return 'Simple';
      case 'velocity_based': return 'Velocity Based';
      case 'days_of_stock': return 'Days of Stock';
      case 'weighted_average': return 'Weighted Average';
      default: return method;
    }
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-500",
      getStatusBorder()
    )}>
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r",
        getStatusGradient()
      )} />

      {/* Animated Glow Effect when calculating */}
      {isCalculating && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-400/10 to-blue-500/5 animate-pulse" />
      )}

      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-6">
          {/* Left Section - Status Icon & Info */}
          <div className="flex items-start gap-5 flex-1">
            {getStatusIcon()}
            
            <div className="flex-1 min-w-0">
              {/* Status Label */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Calculation Engine
                </span>
                {isCalculating && (
                  <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-[10px] px-2 py-0.5 animate-pulse">
                    <Activity className="w-3 h-3 mr-1" />
                    Processing...
                  </Badge>
                )}
                {!isCalculating && configName && calculationStats?.edgeSuccessCount !== undefined && calculationStats.edgeSuccessCount > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px] px-2 py-0.5">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Edge Function Active
                  </Badge>
                )}
                {!isCalculating && configName && calculationStats?.fallbackCount !== undefined && calculationStats.fallbackCount > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-[10px] px-2 py-0.5">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {calculationStats.fallbackCount} Fallback
                  </Badge>
                )}
              </div>

              {/* Config Name */}
              <div className="flex items-center gap-2.5">
                <Calculator className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-lg truncate">
                  {configName || 'No configuration selected'}
                </span>
              </div>

              {/* Active Config Details */}
              {activeConfig && !isCalculating && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {getMethodLabel(activeConfig.calculation_method)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Calculation method used</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {activeConfig.lookback_days}d lookback
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Days of sales history analyzed</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {activeConfig.lead_time_days}d lead time
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Expected delivery time from supplier</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {activeConfig.safety_stock_days}d safety
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Extra buffer stock days</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          Min: {activeConfig.min_order_quantity} / Max: {activeConfig.max_order_quantity}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Order quantity constraints</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              
              {/* Progress Section */}
              {isCalculating && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-medium text-blue-600">
                      {calculatedItems} / {totalItems}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={calculationProgress} className="h-2 bg-blue-500/10" />
                    <div 
                      className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
                      style={{ width: `${calculationProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-blue-500" />
                    Calculating recommended quantities...
                  </p>
                </div>
              )}
              
              {/* Last Calculation Info & Stats */}
              {!isCalculating && lastCalculatedAt && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Last calculated: {format(lastCalculatedAt, 'MMM d, yyyy \'at\' HH:mm')}
                  </div>
                  
                  {calculationStats && (
                    <div className="flex items-center gap-2">
                      {calculationStats.edgeSuccessCount > 0 && (
                        <span className="text-emerald-600 font-medium">
                          ✓ {calculationStats.edgeSuccessCount} edge
                        </span>
                      )}
                      {calculationStats.fallbackCount > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-yellow-600 font-medium cursor-help">
                                ⚠ {calculationStats.fallbackCount} fallback
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Fallback Used</p>
                              <p className="text-xs">These items used simple calculation instead of the configured method.</p>
                              {calculationStats.lastError && (
                                <p className="text-xs text-red-400 mt-1">Last error: {calculationStats.lastError}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {calculationStats.errorCount > 0 && (
                        <span className="text-red-600 font-medium">
                          ✗ {calculationStats.errorCount} errors
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Stats & Actions */}
          <div className="flex items-center gap-4">
            {/* Quick Stats */}
            {!isCalculating && configName && (
              <div className="hidden md:flex items-center gap-3 pr-4 border-r border-border/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{totalItems}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Items</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenConfig}
                className="gap-2 h-10 px-4"
                disabled={isCalculating}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Configure</span>
              </Button>
              
              <Button
                size="sm"
                onClick={onRecalculate}
                disabled={isCalculating || !configName}
                className={cn(
                  "gap-2 h-10 px-5 font-medium transition-all duration-300",
                  isCalculating 
                    ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25" 
                    : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                )}
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Recalculate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
