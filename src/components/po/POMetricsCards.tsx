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
  notFoundCount
}: POMetricsCardsProps) {
  const totalUnits = pendingUnits + fulfilledUnits;
  const fulfillmentPercentage = totalUnits > 0 ? fulfilledUnits / totalUnits * 100 : 0;
  const inventoryTotal = inStockCount + outOfStockCount + notFoundCount;
  return <div className="space-y-3">
      {/* Overview Cards */}
      

      {/* Progress Section */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-4 space-y-3">
          {/* Fulfillment Progress */}
          

          {/* Inventory Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Inventory Distribution</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xl font-bold text-green-600 dark:text-green-500">{inStockCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">In Stock</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xl font-bold text-orange-600 dark:text-orange-500">{outOfStockCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Out of Stock</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <p className="text-xl font-bold text-gray-600 dark:text-gray-500">{notFoundCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Not Found</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
}