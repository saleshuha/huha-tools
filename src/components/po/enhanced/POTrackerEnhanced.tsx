import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Upload, 
  BarChart3, 
  Package,
  TrendingUp,
  AlertCircle,
  Settings
} from "lucide-react";
import { usePOOrders } from "@/hooks/usePOOrders";
import { usePOMetrics } from "@/hooks/usePOMetrics";
import { useUserProfile } from "@/hooks/useUserProfile";
import { POStatsCards } from "./POStatsCards";
import { POOrdersTable } from "./POOrdersTable";
import { POUploadWizard } from "../POUploadWizard";
import { POProfitAnalytics } from "../POProfitAnalytics";
import { useToast } from "@/hooks/use-toast";

interface POTrackerEnhancedProps {
  defaultTab?: 'overview' | 'upload' | 'tracking' | 'analytics';
}

export const POTrackerEnhanced = ({ defaultTab = 'overview' }: POTrackerEnhancedProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { profile } = useUserProfile();
  const { 
    poOrders, 
    isLoading: ordersLoading, 
    loadingProgress: ordersProgress, 
    loadingStatus: ordersStatus,
    fetchPOOrders, 
    updateOrderStatus, 
    updateTrackingInfo 
  } = usePOOrders();
  
  const { 
    metrics, 
    totals, 
    isLoading: metricsLoading, 
    fetchMetrics, 
    fetchTotals 
  } = usePOMetrics();
  
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'tracking') {
      fetchPOOrders(true);
      fetchMetrics(true);
      fetchTotals();
    }
  }, [activeTab, fetchPOOrders, fetchMetrics, fetchTotals]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchPOOrders(true),
        fetchMetrics(true),
        fetchTotals()
      ]);
      toast({
        title: "Success",
        description: "Data refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUploadComplete = () => {
    handleRefreshData();
    setActiveTab('overview');
  };

  // Filter orders based on current criteria
  const filteredOrders = poOrders.filter(order => {
    if (statusFilter === 'active') {
      return ['pending', 'ordered', 'shipped'].includes(order.status);
    } else if (statusFilter === 'completed') {
      return ['delivered', 'closed'].includes(order.status);
    }
    return statusFilter === 'all' || order.status === statusFilter;
  });

  const activeOrders = poOrders.filter(o => ['pending', 'ordered', 'shipped'].includes(o.status));
  const inventoryMatches = 0; // This would be calculated from inventory matching logic
  const inStockItems = 0; // This would be calculated from inventory data

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PO Management</h2>
          <p className="text-muted-foreground">
            Comprehensive purchase order tracking and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress indicator - always visible during processing */}
      {(ordersLoading || ordersProgress > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  {ordersLoading ? 'Processing Data' : 'Background Processing'}
                </span>
                <span className="text-sm font-semibold">{ordersProgress}%</span>
              </div>
              <Progress value={ordersProgress} className="h-3" />
              {ordersStatus && (
                <p className="text-xs text-muted-foreground">{ordersStatus}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload PO
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Order Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <POStatsCards 
            orders={activeOrders} 
            inventoryMatches={inventoryMatches}
            inStockItems={inStockItems}
          />
          
          {/* Quick overview table with recent orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Orders</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('tracking')}
                >
                  View All Orders
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <POOrdersTable
                orders={activeOrders.slice(0, 10)}
                onUpdateStatus={updateOrderStatus}
                onUpdateTracking={updateTrackingInfo}
                isLoading={ordersLoading}
                showPOGroups={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <POUploadWizard onUploadComplete={handleUploadComplete} />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Tracking</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{filteredOrders.length} orders</Badge>
            </div>
          </div>
          <POOrdersTable
            orders={filteredOrders}
            onUpdateStatus={updateOrderStatus}
            onUpdateTracking={updateTrackingInfo}
            isLoading={ordersLoading}
            showPOGroups={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <POProfitAnalytics poOrders={poOrders} />
        </TabsContent>
      </Tabs>
    </div>
  );
};