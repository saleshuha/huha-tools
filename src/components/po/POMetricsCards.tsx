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

  const matchedInStockPercentage = totalItems > 0 ? (inStockCount / totalItems) * 100 : 0;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {/* Total Items Card */}
      <Card className="flex-shrink-0 w-48 border-2 border-border/60 bg-card hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Items</p>
              <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{totalItems}</p>
              <p className="text-xs text-muted-foreground">{totalUnits} units</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-soft">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matched In-Stock Card - NEW */}
      <Card className="flex-shrink-0 w-48 border-2 border-success/40 bg-success/5 hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Matched & In Stock</p>
              <p className="text-2xl font-bold text-success">{inStockCount}</p>
              <p className="text-xs text-success/80">{matchedInStockPercentage.toFixed(1)}% of total</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center shadow-soft border border-success/30">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fulfilled Card */}
      <Card className="flex-shrink-0 w-48 border-2 border-border/60 bg-card hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Fulfilled</p>
              <p className="text-2xl font-bold bg-gradient-emerald bg-clip-text text-transparent">{fulfilledUnits}</p>
              <p className="text-xs text-emerald">{fulfillmentPercentage.toFixed(1)}% done</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gradient-emerald flex items-center justify-center shadow-soft">
              <CheckCircle className="h-5 w-5 text-emerald-foreground" />
            </div>
          </div>
          <Progress value={fulfillmentPercentage} className="h-1.5 bg-emerald/20" />
        </CardContent>
      </Card>

      {/* Pending Card */}
      <Card className="flex-shrink-0 w-48 border-2 border-border/60 bg-card hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-warning">{pendingUnits}</p>
              <p className="text-xs text-warning/80">{(100 - fulfillmentPercentage).toFixed(1)}% left</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shadow-soft border border-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </div>
          <Progress value={100 - fulfillmentPercentage} className="h-1.5 bg-warning/20" />
        </CardContent>
      </Card>

      {/* In Stock Card */}
      <Card className="flex-shrink-0 w-48 border-2 border-border/60 bg-card hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In Stock</p>
              <p className="text-2xl font-bold bg-gradient-emerald bg-clip-text text-transparent">{inStockCount}</p>
              <p className="text-xs text-emerald">
                {inventoryTotal > 0 ? `${((inStockCount / inventoryTotal) * 100).toFixed(0)}%` : '0%'} available
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gradient-emerald flex items-center justify-center shadow-soft">
              <CheckCircle className="h-5 w-5 text-emerald-foreground" />
            </div>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-gradient-emerald transition-all duration-500" 
              style={{ width: `${inventoryTotal > 0 ? (inStockCount / inventoryTotal) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Out of Stock Card */}
      <Card className="flex-shrink-0 w-48 border-2 border-border/60 bg-card hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Out of Stock</p>
              <p className="text-2xl font-bold text-warning">{outOfStockCount}</p>
              <p className="text-xs text-warning/80">
                {inventoryTotal > 0 ? `${((outOfStockCount / inventoryTotal) * 100).toFixed(0)}%` : '0%'} depleted
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shadow-soft border border-warning/20">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-warning transition-all duration-500" 
              style={{ width: `${inventoryTotal > 0 ? (outOfStockCount / inventoryTotal) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Not Found Card */}
      <Card className="flex-shrink-0 w-48 border-2 border-border/60 bg-card hover:shadow-medium transition-all">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Not Found</p>
              <p className="text-2xl font-bold text-muted-foreground">{notFoundCount}</p>
              <p className="text-xs text-muted-foreground/70">
                {inventoryTotal > 0 ? `${((notFoundCount / inventoryTotal) * 100).toFixed(0)}%` : '0%'} unmatched
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shadow-soft border border-border">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            <div 
              className="bg-muted-foreground transition-all duration-500" 
              style={{ width: `${inventoryTotal > 0 ? (notFoundCount / inventoryTotal) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}