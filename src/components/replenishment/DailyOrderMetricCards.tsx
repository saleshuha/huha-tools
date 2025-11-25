import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, ShoppingCart, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DailyOrderMetrics } from "@/hooks/useDailySalesOrders";

interface DailyOrderMetricCardsProps {
  metrics: DailyOrderMetrics;
}

export function DailyOrderMetricCards({ metrics }: DailyOrderMetricCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sold Today</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalSoldToday}</div>
          <p className="text-xs text-muted-foreground">Total units sold</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Need Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{metrics.itemsNeedingOrders}</div>
          <p className="text-xs text-muted-foreground">Items pending order</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ordered</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{metrics.itemsOrdered}</div>
          <p className="text-xs text-muted-foreground">Orders placed today</p>
        </CardContent>
      </Card>

      <Card className={metrics.pendingFromPreviousDays > 0 ? "border-destructive" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Previous Days</CardTitle>
          <AlertCircle className={`h-4 w-4 ${metrics.pendingFromPreviousDays > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${metrics.pendingFromPreviousDays > 0 ? 'text-destructive' : ''}`}>
              {metrics.pendingFromPreviousDays}
            </div>
            {metrics.pendingFromPreviousDays > 0 && (
              <Badge variant="destructive" className="text-xs">!</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Pending from past days</p>
        </CardContent>
      </Card>
    </div>
  );
}
