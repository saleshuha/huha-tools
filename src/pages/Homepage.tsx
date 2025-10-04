import { useEffect, useState } from "react";
import { HuhaHeader01 } from "@/components/ui/huha-header-01";
import { QuickStatsCard } from "@/components/order-processing/QuickStatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, TrendingUp, AlertTriangle, DollarSign, 
  ShoppingCart, Clock, CheckCircle, Truck,
  BarChart3, RefreshCw, ArrowUpRight, ArrowDownRight,
  Boxes, PackageCheck, Calendar, Activity
} from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";
import { useInventoryAnalytics } from "@/hooks/useInventoryAnalytics";
import { usePOMetrics } from "@/hooks/usePOMetrics";
import { useAmazonOrders } from "@/hooks/useAmazonOrders";
import { useNoonOrders } from "@/hooks/useNoonOrders";
import { useVelocityAnalytics } from "@/hooks/useVelocityAnalytics";
import { useTasks } from "@/hooks/useTasks";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const Homepage = () => {
  const { selectedCountry } = useCountry();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Data hooks
  const { inventoryMetrics, loading: inventoryLoading, loadAnalytics } = useInventoryAnalytics();
  const { metrics: poMetrics, isLoading: poLoading, fetchMetrics } = usePOMetrics();
  const { metrics: amazonMetrics, loading: amazonLoading, refetch: refetchAmazon } = useAmazonOrders();
  const { orders: noonOrders, loading: noonLoading } = useNoonOrders();
  const { velocityMetrics, loading: velocityLoading } = useVelocityAnalytics();
  const { tasks, loading: tasksLoading } = useTasks();

  useEffect(() => {
    loadAllData();
  }, [selectedCountry]);

  const loadAllData = async () => {
    setLastRefresh(new Date());
    loadAnalytics(selectedCountry);
    fetchMetrics();
    refetchAmazon();
  };

  const isLoading = inventoryLoading || poLoading || amazonLoading || velocityLoading || tasksLoading;

  // Calculate derived metrics
  const noonUploaded = noonOrders.filter(o => o.order_status === 'uploaded').length;
  const noonProcessing = noonOrders.filter(o => ['validated', 'ready_for_sunsky'].includes(o.order_status || '')).length;
  const noonDelivered = noonOrders.filter(o => o.order_status === 'delivered').length;
  
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const todayTasks = tasks.filter(t => {
    const taskDate = t.due_date ? new Date(t.due_date) : new Date(t.created_at);
    return format(taskDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }).length;

  const criticalStockCount = inventoryMetrics.forecasting.criticalStockItems || 0;
  const totalInventoryValue = (amazonMetrics?.totalValue || 0).toFixed(0);
  
  // Calculate velocity metrics from topPerformers and criticalItems
  const fastMovingCount = velocityMetrics.fastMovingItems || 0;
  const mediumMovingCount = velocityMetrics.mediumMovingItems || 0;
  const urgentReorderCount = velocityMetrics.totalUrgentItems || 0;

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Enhanced Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary-light)/0.08),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary via-primary-light to-primary-dark shadow-glow" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <HuhaHeader01
            icon={<span className="text-3xl">{selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦'}</span>}
            title={`${selectedCountry} Operations Dashboard`}
            subtitle={`Real-time business intelligence and analytics • Last updated: ${format(lastRefresh, 'HH:mm:ss')}`}
            className="flex-1"
          />
          <Button onClick={loadAllData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <QuickStatsCard
            icon={DollarSign}
            label="Inventory Value"
            value={`$${totalInventoryValue}`}
            variant="primary"
          />
          <QuickStatsCard
            icon={ShoppingCart}
            label="Active POs"
            value={poMetrics.totalActiveOrders}
            variant="info"
          />
          <QuickStatsCard
            icon={AlertTriangle}
            label="Overdue Payments"
            value={amazonMetrics?.overduePayments || 0}
            variant="warning"
          />
          <QuickStatsCard
            icon={Package}
            label="Critical Stock"
            value={criticalStockCount}
            variant="warning"
          />
          <QuickStatsCard
            icon={TrendingUp}
            label="Fast Moving"
            value={fastMovingCount}
            variant="success"
          />
          <QuickStatsCard
            icon={Clock}
            label="Pending Tasks"
            value={pendingTasks}
            variant="neutral"
          />
        </div>

        {/* Operations Overview - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventory Health */}
          <Card className="glass-container border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  Inventory Health
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>Stock levels and movement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Active Items</span>
                    <Badge variant="outline" className="font-bold">
                      {inventoryMetrics.forecasting.totalActiveItems}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock Status</span>
                      <span className="font-medium">
                        {((inventoryMetrics.forecasting.totalActiveItems - criticalStockCount) / 
                          Math.max(inventoryMetrics.forecasting.totalActiveItems, 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={((inventoryMetrics.forecasting.totalActiveItems - criticalStockCount) / 
                        Math.max(inventoryMetrics.forecasting.totalActiveItems, 1)) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="text-2xl font-bold text-success">{fastMovingCount}</div>
                      <div className="text-xs text-muted-foreground">Fast Moving</div>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="text-2xl font-bold text-warning">{mediumMovingCount}</div>
                      <div className="text-xs text-muted-foreground">Medium Moving</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-destructive">Critical Stock Alert</div>
                      <div className="text-xs text-muted-foreground">{criticalStockCount} items need restocking</div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" size="sm">
                    View Restock Report
                    <ArrowUpRight className="h-3 w-3 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Management */}
          <Card className="glass-container border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-primary" />
                  Order Management
                </CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>Purchase orders and fulfillment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <>
                  {/* PO Status */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Purchase Orders</span>
                      <Badge>{poMetrics.uniquePONumbers} POs</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded bg-warning/10 border border-warning/20 text-center">
                        <div className="text-lg font-bold text-warning">{poMetrics.pendingOrders}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div className="p-2 rounded bg-info/10 border border-info/20 text-center">
                        <div className="text-lg font-bold text-info">{poMetrics.orderedOrders}</div>
                        <div className="text-xs text-muted-foreground">Ordered</div>
                      </div>
                      <div className="p-2 rounded bg-primary/10 border border-primary/20 text-center">
                        <div className="text-lg font-bold text-primary">{poMetrics.shippedOrders}</div>
                        <div className="text-xs text-muted-foreground">Shipped</div>
                      </div>
                    </div>
                  </div>

                  {/* Noon Orders */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Noon Orders</span>
                      <Badge variant="outline">{noonOrders.length} total</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Uploaded</span>
                        <span className="font-medium">{noonUploaded}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Processing</span>
                        <span className="font-medium">{noonProcessing}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Delivered</span>
                        <span className="font-medium text-success">{noonDelivered}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" size="sm">
                    View All Orders
                    <ArrowUpRight className="h-3 w-3 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="glass-container border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Performance Metrics
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>Financial and operational KPIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <>
                  {/* Amazon Payments */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium">Amazon Payments</span>
                      <Badge variant="outline">{amazonMetrics?.totalOrders || 0} orders</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded bg-success/10 border border-success/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span className="text-sm text-muted-foreground">Paid</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-success">{amazonMetrics?.paidPayments || 0}</div>
                          <div className="text-xs text-muted-foreground">${(amazonMetrics?.paidValue || 0).toFixed(0)}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 rounded bg-warning/10 border border-warning/20">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-warning" />
                          <span className="text-sm text-muted-foreground">Pending</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-warning">{amazonMetrics?.pendingPayments || 0}</div>
                          <div className="text-xs text-muted-foreground">${(amazonMetrics?.pendingValue || 0).toFixed(0)}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 rounded bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                          <span className="text-sm text-muted-foreground">Overdue</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-destructive">{amazonMetrics?.overduePayments || 0}</div>
                          <div className="text-xs text-muted-foreground">${(amazonMetrics?.overdueValue || 0).toFixed(0)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Velocity Insights */}
                  <div className="p-3 rounded-lg bg-gradient-primary text-primary-foreground">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Velocity Insights</span>
                    </div>
                    <div className="text-2xl font-bold">{urgentReorderCount}</div>
                    <div className="text-xs opacity-90">Items need urgent reorder</div>
                  </div>

                  <Button variant="outline" className="w-full" size="sm">
                    View Analytics
                    <ArrowUpRight className="h-3 w-3 ml-2" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks & Alerts Section */}
        <Card className="glass-container border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Tasks & Alerts
                </CardTitle>
                <CardDescription>Today's priorities and action items</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{todayTasks} today</Badge>
                <Badge variant={pendingTasks > 0 ? "destructive" : "secondary"}>
                  {pendingTasks} pending
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending tasks. You're all caught up!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border transition-all hover:scale-105 ${
                      task.completed
                        ? 'bg-muted/50 border-muted opacity-60'
                        : 'bg-card border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        task.completed ? 'bg-success border-success' : 'border-muted-foreground'
                      }`}>
                        {task.completed && <CheckCircle className="h-3 w-3 text-success-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                        {task.due_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tasks.length > 6 && (
              <Button variant="ghost" className="w-full mt-4">
                View All Tasks ({tasks.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <Package className="h-6 w-6" />
            <span className="text-sm">Add Inventory</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <ShoppingCart className="h-6 w-6" />
            <span className="text-sm">Create PO</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <BarChart3 className="h-6 w-6" />
            <span className="text-sm">View Reports</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4">
            <Calendar className="h-6 w-6" />
            <span className="text-sm">Add Task</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
