import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, TrendingDown, Package, 
  DollarSign, Calendar, Activity, AlertTriangle
} from 'lucide-react';

export interface StockHistoryStatistics {
  totalChanges: number;
  increases: number;
  decreases: number;
  totalIncrease: number;
  totalDecrease: number;
  netChange: number;
  poFulfillments: number;
  refTypeBreakdown: Record<string, number>;
  averageDailyChange?: number;
  totalValue?: number;
  averageCost?: number;
  largestIncrease?: number;
  largestDecrease?: number;
  daysTracked?: number;
  velocity?: number;
}

interface StockHistoryStatsProps {
  stats: StockHistoryStatistics;
}

export function StockHistoryStats({ stats }: StockHistoryStatsProps) {
  return (
    <Card className="bg-gradient-to-r from-background to-muted/20 border-primary/20">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          Stock Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Total Changes */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span className="text-xs">Total Changes</span>
            </div>
            <div className="text-2xl font-bold text-primary">{stats.totalChanges}</div>
          </div>

          {/* Total Added */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">Total Added</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{stats.totalIncrease}
            </div>
          </div>

          {/* Total Removed */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-3 h-3" />
              <span className="text-xs">Total Removed</span>
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              -{stats.totalDecrease}
            </div>
          </div>

          {/* Net Change */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Package className="w-3 h-3" />
              <span className="text-xs">Net Change</span>
            </div>
            <div className={`text-2xl font-bold ${
              stats.netChange > 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : stats.netChange < 0 
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-muted-foreground'
            }`}>
              {stats.netChange > 0 ? '+' : ''}{stats.netChange}
            </div>
          </div>

          {/* PO Fulfillments */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
              <Package className="w-3 h-3" />
              <span className="text-xs">PO Fulfills</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.poFulfillments}
            </div>
          </div>

          {/* Increase Count */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">Increases</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.increases}
            </div>
          </div>
        </div>

        {/* Additional Metrics Row */}
        {(stats.totalValue || stats.averageDailyChange || stats.velocity) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            {stats.totalValue && (
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  <span className="text-xs">Total Value</span>
                </div>
                <div className="text-lg font-semibold text-primary">
                  ${stats.totalValue.toFixed(2)}
                </div>
              </div>
            )}
            
            {stats.averageDailyChange !== undefined && (
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span className="text-xs">Avg Daily Change</span>
                </div>
                <div className="text-lg font-semibold">
                  {stats.averageDailyChange > 0 ? '+' : ''}{stats.averageDailyChange.toFixed(1)}
                </div>
              </div>
            )}

            {stats.velocity !== undefined && (
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  <span className="text-xs">Velocity</span>
                </div>
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {stats.velocity.toFixed(1)}/day
                </div>
              </div>
            )}

            {stats.largestIncrease && (
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">Largest Increase</span>
                </div>
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  +{stats.largestIncrease}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reference Type Breakdown */}
        {Object.keys(stats.refTypeBreakdown).length > 1 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <span className="text-xs text-muted-foreground font-medium">Type Breakdown:</span>
            {Object.entries(stats.refTypeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
