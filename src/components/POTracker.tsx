import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Search, Package, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw, Eye, MousePointer, Truck, ExternalLink, PackageCheck, Archive, Copy, Database } from 'lucide-react';
import { POFileUpload } from './po/POFileUpload';
import { POProfitAnalytics } from './po/POProfitAnalytics';
import { ShippingRateDialog } from './po/ShippingRateDialog';
import { BulkPOProcessor } from './po/BulkPOProcessor';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { usePOMetrics } from '@/hooks/usePOMetrics';
import { useToast } from '@/hooks/use-toast';

export function POTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shippingRate, setShippingRate] = useState(0.005);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [mergeDuplicates, setMergeDuplicates] = useState(false);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [inventoryData, setInventoryData] = useState<{asinInventory: any[], skuInventory: any[]}>({
    asinInventory: [],
    skuInventory: []
  });
  const { profile } = useUserProfile();
  const { toast } = useToast();

  // Initialize hooks
  const {
    poOrders,
    isLoading: ordersLoading,
    loadingProgress: ordersProgress,
    loadingStatus: ordersStatus,
    fetchPOOrders,
    processPOFiles,
    updateOrderStatus,
    updateTrackingInfo
  } = usePOOrders();

  const { metrics, totals, isLoading: metricsLoading, fetchMetrics, fetchTotals } = usePOMetrics();

  // Load shipping rate from localStorage or profile on component mount
  useEffect(() => {
    const loadShippingRate = () => {
      try {
        // First try to load from localStorage for immediate availability
        const savedRate = localStorage.getItem(`shipping_rate_${profile?.id || 'default'}`);
        if (savedRate) {
          setShippingRate(parseFloat(savedRate));
        }
      } catch (error) {
        console.error('Failed to load shipping rate from localStorage:', error);
      }
    };

    loadShippingRate();

    // Profile doesn't have shipping_rate anymore
  }, [profile]);

  const handleUpdateShippingRate = async (newRate: number) => {
    setIsUpdatingRate(true);
    try {
      setShippingRate(newRate);
      
      // Save to localStorage first for immediate persistence
      localStorage.setItem(`shipping_rate_${profile?.id || 'default'}`, newRate.toString());
      
      // Then try to save to profile
      if (profile?.id) {
        // Profile doesn't have shipping_rate field anymore
        const error = null;

        if (error) {
          console.error('Failed to update shipping rate in profile:', error);
          throw error;
        }
      }

      toast({
        title: "Shipping Rate Updated",
        description: `Rate updated to ${(newRate * 100).toFixed(1)}%`,
      });
    } catch (error) {
      console.error('Failed to update shipping rate:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update shipping rate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRate(false);
    }
  };

  // Fetch inventory data to match with PO ASINs
  const fetchInventoryData = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const [asinResult, skuResult] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('*')
          .eq('user_id', user.data.user.id)
          .eq('country', profile?.country || 'UAE'),
        supabase
          .from('sku_inventory')
          .select('*')
          .eq('user_id', user.data.user.id)
          .eq('country', profile?.country || 'UAE')
      ]);

      if (asinResult.error) throw asinResult.error;
      if (skuResult.error) throw skuResult.error;

      setInventoryData({
        asinInventory: asinResult.data || [],
        skuInventory: skuResult.data || []
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  // Force refresh all data
  const forceRefreshData = async () => {
    console.log('🔄 Force refreshing all PO data...');
    await Promise.all([
      fetchPOOrders(true), // Force raw data
      fetchMetrics(true),  // Force raw data  
      fetchTotals(),       // Fetch new totals
      fetchInventoryData()
    ]);
    console.log('✅ Force refresh completed');
  };

  // Clear all PO data for fresh upload
  const clearAllPOData = async () => {
    if (!confirm('⚠️ ARE YOU SURE?\n\nThis will DELETE ALL your PO orders permanently!\n\nThis action cannot be undone. Click OK only if you want to start fresh.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🗑️ Starting to delete ALL PO orders for user:', user.id);

      // Delete all PO orders for the current user
      const { error: deleteError, count } = await supabase
        .from('po_orders')
        .delete({ count: 'exact' })
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      console.log(`✅ Successfully deleted ${count || 0} PO orders from database`);

      // Refresh all data to reflect the changes
      await forceRefreshData();

      toast({
        title: "🗑️ All PO Data Cleared",
        description: `Successfully deleted ${count || 0} PO orders. Database is now clean for fresh uploads.`,
      });

      console.log('🎉 Database cleared successfully - ready for new uploads!');
    } catch (error) {
      console.error('❌ Error clearing PO data:', error);
      toast({
        title: "Error",
        description: "Failed to clear PO data: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const findInventoryMatch = (asin: string | null, sunskySku: string | null, poSku: string | null) => {
    console.log(`🔍 POTracker - Finding inventory match for:`, { asin, sunskySku, poSku });
    
    // Try ASIN match first
    if (asin) {
      console.log(`🎯 POTracker - Checking ASIN inventory for: ${asin}`);
      const asinMatch = inventoryData.asinInventory.find(item => item.asin === asin);
      if (asinMatch) {
        console.log(`✅ Found ASIN match for ${asin}:`, asinMatch);
        return {
          type: 'ASIN',
          status: asinMatch.status,
          quantity: asinMatch.quantity,
          identifier: asinMatch.asin
        };
      }
    }

    // Try SKU matches
    const skusToCheck = [sunskySku, poSku].filter(Boolean);
    for (const sku of skusToCheck) {
      const skuMatch = inventoryData.skuInventory.find(item => item.sku_number === sku);
      if (skuMatch) {
        console.log(`✅ Found SKU match for ${sku}:`, skuMatch);
        return {
          type: 'SKU',
          status: skuMatch.status,
          quantity: skuMatch.quantity,
          identifier: skuMatch.sku_number
        };
      }
    }

    // Also check SKU inventory for ASIN matches
    if (asin) {
      console.log(`🎯 POTracker - Checking SKU inventory for ASIN: ${asin}`);
      const skuAsinMatch = inventoryData.skuInventory.find(item => item.sku_number === asin);
      if (skuAsinMatch) {
        console.log(`✅ Found SKU-ASIN match for ${asin}:`, skuAsinMatch);
        return {
          type: 'SKU-ASIN',
          status: skuAsinMatch.status,
          quantity: skuAsinMatch.quantity,
          identifier: skuAsinMatch.sku_number
        };
      }
    }

    console.log(`❌ No inventory match found for any identifier`);
    return null;
  };

  const isItemInStock = (inventoryMatch: any) => {
    if (!inventoryMatch) return false;
    return inventoryMatch.status === 'in-stock' && inventoryMatch.quantity > 0;
  };

  // Load data based on active tab
  useEffect(() => {
    fetchInventoryData();
    fetchMetrics(true); // Use raw data
    fetchTotals(); // Get totals
    
    if (poOrders.length === 0) {
      fetchPOOrders(true); // Use raw data
    }
  }, [activeTab, fetchPOOrders, fetchMetrics, fetchTotals]);

  const handleFileUpload = async (mappedData: any[]) => {
    try {
      await processPOFiles(mappedData, []);
    } catch (error) {
      console.error('Error processing PO files:', error);
    }
  };

  const refreshData = () => {
    forceRefreshData();
  };

  // ============================================================================
  // ACCURATE METRICS FROM NEW DATABASE FUNCTIONS
  // ============================================================================
  
  console.log(`🎯 USING ACCURATE DATABASE METRICS:`);
  console.log(`📦 Active Orders: ${metrics.totalActiveOrders}`);
  console.log(`📋 Active Quantity: ${metrics.totalActiveQuantity}`);
  console.log(`📄 Unique PO Numbers: ${metrics.uniquePONumbers}`);
  
  // Debug specific PO in component state
  const po8RGH1C7S_component = poOrders.filter(o => o.po_number === '8RGH1C7S');
  if (po8RGH1C7S_component.length > 0) {
    const totalQty8RGH1C7S_component = po8RGH1C7S_component.reduce((sum, order) => sum + (order.quantity || 0), 0);
    console.log(`🔍 COMPONENT STATE PO 8RGH1C7S: ${po8RGH1C7S_component.length} orders, ${totalQty8RGH1C7S_component} qty`);
  }
  
  // FOR TABLE DISPLAY: Apply filtering to the canonical data
  const ACTIVE_STATUSES = ['pending', 'ordered', 'shipped'];
  const activeOrders = poOrders.filter(order => ACTIVE_STATUSES.includes(order.status));
  
  console.log(`🔍 TABLE DISPLAY DATA:`);
  console.log(`✅ Active orders for table: ${activeOrders.length}`);
  
  // Matched items calculations (use all orders from database)
  const allMatchedOrdersList = poOrders.filter(order => order.sunsky_sku !== null);
  const matchedItems = allMatchedOrdersList.length;
  const matchedItemsQuantity = allMatchedOrdersList.reduce((sum, order) => sum + (order.quantity || 0), 0);
  
  // Status-based counts
  const pendingMatchedItems = allMatchedOrdersList.filter(order => order.status === 'pending').length;
  const placedOrders = poOrders.filter(order => order.status === 'ordered' || order.status === 'shipped').length;

  // Get actually matched items with stock (cross-reference with inventory)
  const getMatchedItemsWithStock = () => {
    console.log(`🔍 Getting matched items with stock from ${allMatchedOrdersList.length} matched orders`);
    return allMatchedOrdersList.filter(order => {
      if (order.sunsky_sku === null) return false;
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku, order.sku_code);
      return isItemInStock(inventoryMatch);
    }).length;
  };

  // Get matched items with any inventory (in or out of stock)
  const getMatchedItemsWithInventory = () => {
    console.log(`🔍 Getting matched items with inventory from ${allMatchedOrdersList.length} matched orders`);
    return allMatchedOrdersList.filter(order => {
      if (order.sunsky_sku === null) return false;
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku, order.sku_code);
      return inventoryMatch !== null;
    }).length;
  };

  // Get total quantity of in-stock matched items
  const getTotalInStockQuantity = () => {
    console.log(`🔍 Getting total in-stock quantity from ${allMatchedOrdersList.length} matched orders`);
    return allMatchedOrdersList.reduce((total, order) => {
      if (order.sunsky_sku === null) return total;
      const inventoryMatch = findInventoryMatch(order.asin, order.sunsky_sku, order.sku_code);
      if (isItemInStock(inventoryMatch)) {
        return total + inventoryMatch.quantity;
      }
      return total;
    }, 0);
  };

  const inStockItems = getMatchedItemsWithStock();
  const totalItemsWithInventory = getMatchedItemsWithInventory();
  const totalInStockQuantity = getTotalInStockQuantity();

  // Group PO orders by PO number for table display
  const groupedPOOrders = activeOrders.reduce((groups: any, order) => {
    const poNumber = order.po_number;
    if (!groups[poNumber]) {
      groups[poNumber] = [];
    }
    groups[poNumber].push(order);
    return groups;
  }, {});

  // Convert grouped orders to array and filter
  const filteredPOGroups = Object.entries(groupedPOOrders)
    .map(([poNumber, orders]: [string, any]) => ({ poNumber, orders }))
    .filter(group => {
      const matchesSearch = searchTerm === '' || 
        group.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.orders.some((order: any) => 
          order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.sku_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'all' || 
        group.orders.some((order: any) => order.status === statusFilter);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Prioritize POs with matched items
      const aHasMatched = a.orders.some((order: any) => order.sunsky_sku !== null);
      const bHasMatched = b.orders.some((order: any) => order.sunsky_sku !== null);
      
      if (aHasMatched && !bHasMatched) return -1;
      if (!aHasMatched && bHasMatched) return 1;
      
      // Then sort by creation date (newest first)
      const aDate = new Date(a.orders[0]?.created_at || 0);
      const bDate = new Date(b.orders[0]?.created_at || 0);
      return bDate.getTime() - aDate.getTime();
    });

  // Handle marking PO as delivered and closed
  const handleMarkPODeliveredAndClosed = async (poNumber: string) => {
    try {
      const ordersToUpdate = groupedPOOrders[poNumber] || [];
      
      for (const order of ordersToUpdate) {
        await updateOrderStatus(order.id, 'closed');
      }
      
      toast({
        title: "PO Marked as Delivered & Closed",
        description: `PO ${poNumber} has been marked as delivered and closed.`,
      });
      
      // Refresh data
      await fetchPOOrders();
    } catch (error) {
      console.error('Error marking PO as delivered and closed:', error);
      toast({
        title: "Error",
        description: "Failed to mark PO as delivered and closed.",
        variant: "destructive",
      });
    }
  };

  // Group closed PO orders by PO number for better display
  const closedPOOrders = poOrders.filter(order => order.status === 'closed');
  const groupedClosedPOOrders = closedPOOrders.reduce((groups: any, order) => {
    const poNumber = order.po_number;
    if (!groups[poNumber]) {
      groups[poNumber] = [];
    }
    groups[poNumber].push(order);
    return groups;
  }, {});

  // Convert grouped closed orders to array and filter
  const filteredClosedPOGroups = Object.entries(groupedClosedPOOrders)
    .map(([poNumber, orders]: [string, any]) => ({ poNumber, orders }))
    .filter(group => {
      const matchesSearch = searchTerm === '' || 
        group.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.orders.some((order: any) => 
          order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.sku_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      return matchesSearch;
    })
    .sort((a, b) => {
      // Sort by creation date (newest first)
      const aDate = new Date(a.orders[0]?.created_at || 0);
      const bDate = new Date(b.orders[0]?.created_at || 0);
      return bDate.getTime() - aDate.getTime();
    });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PO Tracker</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and track stock from Sunsky supplier
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={clearAllPOData}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Clear All PO Data
          </Button>
          <Button
            onClick={refreshData}
            disabled={ordersLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Progress Bars - Always visible during any processing */}
      {(ordersLoading || ordersProgress > 0) && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {ordersLoading ? 'Processing Orders' : 'PO Processing'}
                  </span>
                  <span className="text-sm text-muted-foreground">{ordersProgress}%</span>
                </div>
                <Progress value={ordersProgress} className="h-2" />
                {ordersStatus && (
                  <p className="text-xs text-muted-foreground">{ordersStatus}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Explanation Alert */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                PO Data Explanation
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Line Items</strong> = Number of different SKUs in each PO (e.g., 89 different products).
                <br />
                <strong>ASN Quantity</strong> = Total units to receive across all SKUs (e.g., 186 total pieces).
              </p>
              <p className="text-xs text-blue-700">
                Example: PO 88GRL5EC has 89 different products with varying quantities (some 1 pc, some 2 pcs, etc.) totaling 186 units.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Line Items</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metricsLoading ? "..." : metrics.totalActiveOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? "Loading..." : `${metrics.uniquePONumbers} PO numbers`}
            </p>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Matched: {matchedItems.toLocaleString()} ({matchedItemsQuantity.toLocaleString()} qty)
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {inStockItems.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active matched items with available stock
            </p>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Total qty: {totalInStockQuantity.toLocaleString()}
              </Badge>
              {totalItemsWithInventory > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {((inStockItems / totalItemsWithInventory) * 100).toFixed(1)}% with stock
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metricsLoading ? "..." : (metrics.orderedOrders + metrics.shippedOrders).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Orders in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metricsLoading ? "..." : metrics.pendingOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Items waiting to be placed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PO Database Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">PO Database Summary</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefreshData}
              disabled={ordersLoading || metricsLoading}
              className="text-primary hover:bg-primary/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculate Now
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totals.totalRecords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totals.totalQuantity.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Quantity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totals.activeRecords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Active Records</div>
              <div className="text-xs text-green-600">{totals.activeQuantity.toLocaleString()} qty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totals.deliveredRecords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Delivered Records</div>
              <div className="text-xs text-blue-600">{totals.deliveredQuantity.toLocaleString()} qty</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - keeping existing tabs structure */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-14 p-2 bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl shadow-lg">
          <TabsTrigger 
            value="upload" 
            className="relative h-10 px-6 text-sm font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 rounded-lg flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            PO Upload
          </TabsTrigger>
          <TabsTrigger 
            value="tracking" 
            className="relative h-10 px-6 text-sm font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 rounded-lg flex items-center gap-2"
          >
            <Truck className="h-4 w-4" />
            Order Tracking
          </TabsTrigger>
          <TabsTrigger 
            value="closed" 
            className="relative h-10 px-6 text-sm font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 rounded-lg flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            Closed POs
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="relative h-10 px-6 text-sm font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 rounded-lg flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Profit Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Upload</CardTitle>
              <CardDescription>
                Upload PO files (Excel/CSV) to match SKUs and track orders. Supports single or multiple files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <POFileUpload onFilesUpload={handleFileUpload} isLoading={ordersLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active PO Order Tracking</CardTitle>
                  <CardDescription>
                    Track the status of active purchase orders. Click on any row to view detailed information and manage tracking.
                  </CardDescription>
                </div>
                <BulkPOProcessor onProcessComplete={fetchPOOrders} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by PO number, ASIN, title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              {/* PO Orders Table */}
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading orders...</span>
                </div>
              ) : filteredPOGroups.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No PO Orders Found</h3>
                  <p className="text-muted-foreground">Upload PO files to start tracking orders.</p>
                </div>
              ) : (
                <div className="border-2 border-primary/20 rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-primary/30">
                        <TableHead>PO Details</TableHead>
                        <TableHead>Progress & Status</TableHead>
                        <TableHead>Tracking Info</TableHead>
                        <TableHead>PO Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOGroups.map(({ poNumber, orders }) => {
                        const firstOrder = orders[0];
                        const totalQuantity = orders.reduce((sum: number, order: any) => sum + (order.quantity || 0), 0);
                        const matchedCount = orders.filter((order: any) => order.sunsky_sku !== null).length;
                        const matchedPercentage = ((matchedCount / orders.length) * 100).toFixed(0);
                        
                        const statusCounts = orders.reduce((counts: any, order: any) => {
                          counts[order.status] = (counts[order.status] || 0) + 1;
                          return counts;
                        }, {});

                        const primaryStatus = Object.entries(statusCounts).reduce((a: any, b: any) => 
                          statusCounts[a[0]] > statusCounts[b[0]] ? a : b
                        )[0];

                        return (
                          <TableRow 
                            key={poNumber}
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/po-details/${encodeURIComponent(poNumber)}`)}
                          >
                            <TableCell className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{poNumber}</span>
                                 <Badge variant="outline" className="text-xs">
                                   {orders.length} line items
                                 </Badge>
                                 <Badge variant="outline" className="text-xs">
                                   {totalQuantity} ASN units
                                 </Badge>
                              </div>
                              {firstOrder.title && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {firstOrder.title}
                                </p>
                              )}
                              {firstOrder.asin && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">ASIN:</span>
                                  <span className="text-xs font-mono">{firstOrder.asin}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Progress value={parseInt(matchedPercentage)} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground min-w-fit">
                                  {matchedPercentage}%
                                </span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground">{matchedCount}/{orders.length} matched</span>
                              </div>
                              {matchedCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <PackageCheck className="w-3 h-3 mr-1" />
                                  Matched
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="space-y-1">
                              {firstOrder.tracking_number ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Tracking:</span>
                                    <span className="text-xs font-mono">{firstOrder.tracking_number}</span>
                                  </div>
                                  {firstOrder.tracking_url && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 p-1 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(firstOrder.tracking_url, '_blank');
                                      }}
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Track
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No tracking info</span>
                              )}
                            </TableCell>
                            <TableCell className="space-y-1">
                              <Badge 
                                variant={
                                  primaryStatus === 'delivered' ? 'default' :
                                  primaryStatus === 'shipped' ? 'secondary' :
                                  primaryStatus === 'ordered' ? 'secondary' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {primaryStatus}
                              </Badge>
                              {Object.keys(statusCounts).length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  Mixed status
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/po-details/${encodeURIComponent(poNumber)}`);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {primaryStatus !== 'delivered' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkPODeliveredAndClosed(poNumber);
                                    }}
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Closed PO Orders</CardTitle>
              <CardDescription>
                View closed purchase orders that have been delivered and completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Controls */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search closed POs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Closed PO Orders Table */}
              {filteredClosedPOGroups.length === 0 ? (
                <div className="text-center py-16">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Closed PO Orders</h3>
                  <p className="text-muted-foreground">Closed PO orders will appear here once delivered.</p>
                </div>
              ) : (
                <div className="border-2 border-primary/20 rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-primary/30">
                        <TableHead>PO Details</TableHead>
                        <TableHead>Items & Quantities</TableHead>
                        <TableHead>Closed Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClosedPOGroups.map(({ poNumber, orders }) => {
                        const firstOrder = orders[0];
                        const totalQuantity = orders.reduce((sum: number, order: any) => sum + (order.quantity || 0), 0);
                        const closedDate = new Date(firstOrder.updated_at).toLocaleDateString();

                        return (
                          <TableRow 
                            key={poNumber}
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/po-details/${encodeURIComponent(poNumber)}`)}
                          >
                            <TableCell className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{poNumber}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Closed
                                </Badge>
                              </div>
                              {firstOrder.title && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {firstOrder.title}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {orders.length} items
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {totalQuantity} total qty
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{closedDate}</span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/po-details/${encodeURIComponent(poNumber)}`);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <POProfitAnalytics poOrders={poOrders} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
