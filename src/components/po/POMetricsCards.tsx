import { Package, CheckCircle, Clock, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface POMetricsCardsProps {
  totalItems: number;
  pendingUnits: number;
  fulfilledUnits: number;
  totalValue: number;
  currency: string;
  inStockCount: number;
  outOfStockCount: number;
  notFoundCount: number;
}

export function POMetricsCards({
  totalItems,
  pendingUnits,
  fulfilledUnits,
  totalValue,
  currency,
  inStockCount,
  outOfStockCount,
  notFoundCount
}: POMetricsCardsProps) {
  const totalUnits = pendingUnits + fulfilledUnits;
  const fulfillmentPercentage = totalUnits > 0 ? (fulfilledUnits / totalUnits) * 100 : 0;
  const inventoryTotal = inStockCount + outOfStockCount + notFoundCount;
  const inStockPercentage = inventoryTotal > 0 ? (inStockCount / inventoryTotal) * 100 : 0;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {/* Total Items Card */}
      <Card className="border-border/40 bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-md transition-all flex-shrink-0 w-48">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Total Items</p>
              <p className="text-xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">{totalUnits} units</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fulfillment Card */}
      <Card className="border-border/40 bg-gradient-to-br from-green-500/5 via-background to-background hover:shadow-md transition-all flex-shrink-0 w-48">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Fulfilled</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-500">{fulfilledUnits}</p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">{fulfillmentPercentage.toFixed(1)}%</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
            </div>
          </div>
          <Progress value={fulfillmentPercentage} className="h-1 bg-green-500/20" />
        </CardContent>
      </Card>

      {/* Pending Card */}
      <Card className="border-border/40 bg-gradient-to-br from-yellow-500/5 via-background to-background hover:shadow-md transition-all flex-shrink-0 w-48">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Pending</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-500">{pendingUnits}</p>
              <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70">{(100 - fulfillmentPercentage).toFixed(1)}%</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <Progress value={100 - fulfillmentPercentage} className="h-1 bg-yellow-500/20" />
        </CardContent>
      </Card>

      {/* Total Value Card */}
      <Card className="border-border/40 bg-gradient-to-br from-blue-500/5 via-background to-background hover:shadow-md transition-all flex-shrink-0 w-48">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground font-medium">Total Value</p>
              <p className="text-xl font-bold">{totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{currency}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Distribution - Compact */}
      <Card className="border-border/40 bg-card hover:shadow-md transition-all flex-shrink-0 min-w-[400px]">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">Inventory Status</h3>
            </div>
            <div className="text-xs text-muted-foreground">
              {inStockPercentage.toFixed(1)}% available
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="group relative overflow-hidden rounded-lg bg-green-500/5 border border-green-500/20 p-2 hover:bg-green-500/10 transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="h-6 w-6 rounded-md bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-500" />
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-500">{inStockCount}</span>
              </div>
              <p className="text-xs font-medium text-green-700 dark:text-green-400">In Stock</p>
            </div>

            <div className="group relative overflow-hidden rounded-lg bg-orange-500/5 border border-orange-500/20 p-2 hover:bg-orange-500/10 transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="h-6 w-6 rounded-md bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-3 w-3 text-orange-600 dark:text-orange-500" />
                </div>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-500">{outOfStockCount}</span>
              </div>
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Out of Stock</p>
            </div>

            <div className="group relative overflow-hidden rounded-lg bg-gray-500/5 border border-gray-500/20 p-2 hover:bg-gray-500/10 transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="h-6 w-6 rounded-md bg-gray-500/10 flex items-center justify-center">
                  <AlertCircle className="h-3 w-3 text-gray-600 dark:text-gray-500" />
                </div>
                <span className="text-lg font-bold text-gray-600 dark:text-gray-500">{notFoundCount}</span>
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-400">Not Found</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
              <div 
                className="bg-green-500 transition-all duration-500" 
                style={{ width: `${(inStockCount / inventoryTotal) * 100}%` }}
              />
              <div 
                className="bg-orange-500 transition-all duration-500" 
                style={{ width: `${(outOfStockCount / inventoryTotal) * 100}%` }}
              />
              <div 
                className="bg-gray-500 transition-all duration-500" 
                style={{ width: `${(notFoundCount / inventoryTotal) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}