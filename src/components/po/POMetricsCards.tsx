import { Package, CheckCircle, Clock, TrendingUp } from 'lucide-react';
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
  notFoundCount,
}: POMetricsCardsProps) {
  const totalUnits = pendingUnits + fulfilledUnits;
  const fulfillmentPercentage = totalUnits > 0 ? (fulfilledUnits / totalUnits) * 100 : 0;
  const inventoryTotal = inStockCount + outOfStockCount + notFoundCount;

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold mt-2">{totalItems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Units */}
        <Card className="border-border/40 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Units</p>
                <p className="text-3xl font-bold mt-2">{pendingUnits}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalUnits > 0 ? ((pendingUnits / totalUnits) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fulfilled Units */}
        <Card className="border-border/40 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fulfilled Units</p>
                <p className="text-3xl font-bold mt-2">{fulfilledUnits}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalUnits > 0 ? ((fulfilledUnits / totalUnits) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="border-border/40 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-3xl font-bold mt-2">
                  {totalValue.toLocaleString()} {currency}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          {/* Fulfillment Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Fulfillment Progress</span>
              <span className="text-muted-foreground">{fulfillmentPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={fulfillmentPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fulfilledUnits} fulfilled</span>
              <span>{pendingUnits} pending</span>
            </div>
          </div>

          {/* Inventory Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Inventory Distribution</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{inStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">In Stock</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{outOfStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Out of Stock</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-500">{notFoundCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Not Found</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
