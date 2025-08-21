import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  Clock,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Target
} from "lucide-react";
import { POOrder } from "@/hooks/usePOOrders";

interface POStatsCardsProps {
  orders: POOrder[];
  inventoryMatches?: number;
  inStockItems?: number;
}

export const POStatsCards = ({ orders, inventoryMatches = 0, inStockItems = 0 }: POStatsCardsProps) => {
  // Calculate metrics
  const metrics = {
    totalOrders: orders.length,
    totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
    totalValue: orders.reduce((sum, order) => sum + (order.total_cost || 0), 0),
    uniquePOs: new Set(orders.map(o => o.po_number)).size,
    
    // Status breakdowns
    pending: orders.filter(o => o.status === 'pending').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    
    // Completion rate
    completedOrders: orders.filter(o => ['delivered', 'closed'].includes(o.status)).length,
    
    // Recent activity (last 7 days)
    recentOrders: orders.filter(o => {
      const orderDate = new Date(o.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return orderDate > weekAgo;
    }).length
  };

  const completionRate = metrics.totalOrders > 0 
    ? Math.round((metrics.completedOrders / metrics.totalOrders) * 100) 
    : 0;

  const inventoryMatchRate = metrics.totalOrders > 0 
    ? Math.round((inventoryMatches / metrics.totalOrders) * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {/* Total Orders */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalOrders.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.uniquePOs} unique PO numbers
          </p>
        </CardContent>
      </Card>

      {/* Total Quantity */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalQuantity.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Items in pipeline
          </p>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${metrics.totalValue.toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated order value
          </p>
        </CardContent>
      </Card>

      {/* Pipeline Status */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending</span>
              <Badge variant="secondary">{metrics.pending}</Badge>
            </div>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Match */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Match</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">{inventoryMatches}</div>
            <Progress value={inventoryMatchRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {inventoryMatchRate}% matched with inventory
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.recentOrders}</div>
          <p className="text-xs text-muted-foreground">
            Orders added this week
          </p>
          <div className="flex gap-1 mt-2">
            <Badge variant="secondary" className="text-xs">
              {metrics.ordered} ordered
            </Badge>
            <Badge variant="outline" className="text-xs">
              {metrics.shipped} shipped
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};