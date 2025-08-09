import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Search, Package, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw, Eye, MousePointer, Truck, ExternalLink, PackageCheck } from 'lucide-react';
import { POFileUpload } from './po/POFileUpload';
import { SKUList } from './po/SKUList';
import { AddSKUDialog } from './po/AddSKUDialog';
import { POProfitAnalytics } from './po/POProfitAnalytics';
import { ShippingRateDialog } from './po/ShippingRateDialog';
import { useSKUManager } from '@/hooks/useSKUManager';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function POTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shippingRate, setShippingRate] = useState(0.005);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [inventoryData, setInventoryData] = useState<{asinInventory: any[], skuInventory: any[]}>({
    asinInventory: [],
    skuInventory: []
  });
  const { profile } = useUserProfile();
  const { toast } = useToast();

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
  }, [profile?.id]);

  // Function to save shipping rate permanently
  const handleUpdateShippingRate = async (newRate: number) => {
    setIsUpdatingRate(true);
    try {
      // Save to localStorage for immediate persistence
      localStorage.setItem(`shipping_rate_${profile?.id || 'default'}`, newRate.toString());
      
      // Also save to user profile for cross-device persistence
      if (profile?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            shipping_rate: newRate,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (error) {
          console.error('Failed to save shipping rate to profile:', error);
          toast({
            title: "Warning",
            description: "Shipping rate saved locally but failed to sync to your profile",
            variant: "destructive"
          });
        }
      }

      setShippingRate(newRate);
      
      toast({
        title: "Success",
        description: `Shipping rate permanently saved: ${newRate.toFixed(3)} per gram`,
      });
    } catch (error) {
      console.error('Failed to save shipping rate:', error);
      toast({
        title: "Error",
        description: "Failed to save shipping rate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingRate(false);
    }
  };
  
  // Separate hooks for different functionalities
  const {
    sunskySKUs,
    isLoading: skuLoading,
    loadingProgress: skuProgress,
    loadingStatus: skuStatus,
    totalCount,
    hasMoreSKUs,
    fetchSKUs,
    fetchSKUCount,
    loadMoreSKUs,
    addSKUs,
    refreshSKUs
  } = useSKUManager();

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

  // Force refresh all data
  const forceRefreshData = async () => {
    await Promise.all([
      fetchPOOrders(),
      fetchInventoryData()
    ]);
  };

  // Fetch inventory data to match with PO ASINs
  const fetchInventoryData = async () => {
    try {
      const [asinResult, skuResult] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('asin, quantity, status, sku')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id),
        supabase
          .from('sku_inventory')
          .select('sku_number, quantity, status')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
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

  // Helper function to check if an inventory item is truly in stock
  const isItemActuallyInStock = (inventoryItem: any) => {
    return inventoryItem && 
           inventoryItem.status === 'in-stock' && 
           inventoryItem.quantity > 0;
  };

  // Function to find inventory match for an ASIN or SKU
  const findInventoryMatch = (asin: string, sku?: string, poOrderSkuCode?: string) => {
    // First check ASIN inventory
    const asinMatch = inventoryData.asinInventory.find(item => item.asin === asin);
    if (asinMatch) {
      return {
        type: 'ASIN',
        status: asinMatch.status,
        quantity: asinMatch.quantity,
        identifier: asinMatch.asin,
        isActuallyInStock: isItemActuallyInStock(asinMatch)
      };
    }

    // Then check SKU inventory with multiple possible SKU sources
    const skusToCheck = [sku, poOrderSkuCode].filter(Boolean);
    
    for (const skuToCheck of skusToCheck) {
      if (skuToCheck) {
        const skuMatch = inventoryData.skuInventory.find(item => item.sku_number === skuToCheck);
        if (skuMatch) {
          return {
            type: 'SKU',
            status: skuMatch.status,
            quantity: skuMatch.quantity,
            identifier: skuMatch.sku_number,
            isActuallyInStock: isItemActuallyInStock(skuMatch)
          };
        }
      }
    }

    return null;
  };

  // Load data based on active tab
  useEffect(() => {
    fetchSKUCount();
    fetchInventoryData(); // Always fetch inventory data for proper metrics
    
    if (activeTab === 'skus' && sunskySKUs.length === 0) {
      fetchSKUs();
    } else if ((activeTab === 'upload' || activeTab === 'tracking' || activeTab === 'analytics') && poOrders.length === 0) {
      fetchPOOrders();
    }
  }, [activeTab, sunskySKUs.length, poOrders.length, fetchSKUs, fetchSKUCount, fetchPOOrders]);

  const handleFileUpload = async (mappedData: any[]) => {
    try {
      await processPOFiles(mappedData, sunskySKUs);
    } catch (error) {
      console.error('Error processing PO files:', error);
    }
  };


  const refreshData = () => {
    if (activeTab === 'skus') {
      refreshSKUs();
    } else {
      forceRefreshData();
    }
  };

  const filteredSKUs = sunskySKUs.filter(sku => 
    sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate accurate metrics based on database matching
  const totalSKUs = totalCount;
  const totalOrderRecords = poOrders.length;
  const totalItemsQuantity = poOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
  const uniquePONumbers = new Set(poOrders.map(order => order.po_number)).size;
  
  // Matched items - use database-level matching (items with sunsky_sku populated)
  const matchedItems = poOrders.filter(order => order.sunsky_sku !== null).length;
  const matchedItemsQuantity = poOrders
    .filter(order => order.sunsky_sku !== null)
    .reduce((sum, order) => sum + (order.quantity || 0), 0);
  
  // Pending matched orders - matched items that are still pending
  const pendingMatchedOrders = poOrders.filter(order => 
    order.status === 'pending' && order.sunsky_sku !== null
  ).length;
  
  // Pending matched quantity - total quantity of matched items that are still pending
  const pendingMatchedQuantity = poOrders
    .filter(order => order.status === 'pending' && order.sunsky_sku !== null)
    .reduce((sum, order) => sum + (order.quantity || 0), 0);
  
  // Placed orders - all orders with status 'ordered'
  const placedOrders = poOrders.filter(order => order.status === 'ordered').length;

  // Calculate inventory matches for all PO items
  const inventoryMatches = poOrders.map(order => ({
    ...order,
    inventoryMatch: findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code)
  }));

  // Calculate inventory statistics using the new logic
  const totalItemsWithInventory = inventoryMatches.filter(item => item.inventoryMatch).length;
  const inStockItems = inventoryMatches.filter(item => 
    item.inventoryMatch && item.inventoryMatch.isActuallyInStock
  ).length;
  const totalInStockQuantity = inventoryMatches
    .filter(item => item.inventoryMatch && item.inventoryMatch.isActuallyInStock)
    .reduce((sum, item) => sum + (item.inventoryMatch?.quantity || 0), 0);

  // Group orders by PO number for the tracking table
  const groupedPOOrders = poOrders.reduce((groups, order) => {
    const poNumber = order.po_number;
    if (!groups[poNumber]) {
      groups[poNumber] = [];
    }
    groups[poNumber].push(order);
    return groups;
  }, {} as Record<string, typeof poOrders>);

  // Filter grouped orders based on search and status
  const filteredPOGroups = Object.entries(groupedPOOrders)
    .filter(([poNumber, orders]) => {
      const matchesSearch = !searchTerm || 
        poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orders.some(order => 
          order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.model_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'all' || 
        orders.some(order => order.status === statusFilter);
      
      return matchesSearch && matchesStatus;
    })
    // Sort groups - ALWAYS put matched POs first
    .sort(([poA, ordersA], [poB, ordersB]) => {
      // Primary sort: matched POs first
      const matchedA = ordersA.filter(order => order.sunsky_sku !== null).length > 0;
      const matchedB = ordersB.filter(order => order.sunsky_sku !== null).length > 0;
      
      if (matchedA && !matchedB) return -1; // A has matches, B doesn't - A comes first
      if (!matchedA && matchedB) return 1;  // B has matches, A doesn't - B comes first
      
      // Secondary sort: for items with same match status, sort by PO number
      return poA.localeCompare(poB);
    });

  const handlePORowClick = (poNumber: string) => {
    navigate(`/po-details/${encodeURIComponent(poNumber)}`);
  };

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">{/* Add max-width constraint to match other pages */}
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PO Tracker</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and track SKUs from Sunsky supplier
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={skuLoading || ordersLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${(skuLoading || ordersLoading) ? 'animate-spin' : ''}`} />
          Refresh {activeTab === 'skus' ? 'SKUs' : 'Orders'}
        </Button>
      </div>

      {/* Progress Bars */}
      {(skuLoading || ordersLoading) && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {skuLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Loading SKUs
                    </span>
                    <span className="text-sm text-muted-foreground">{skuProgress}%</span>
                  </div>
                  <Progress value={skuProgress} className="h-2" />
                  {skuStatus && (
                    <p className="text-xs text-muted-foreground">{skuStatus}</p>
                  )}
                </div>
              )}
              {ordersLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Loading Orders
                    </span>
                    <span className="text-sm text-muted-foreground">{ordersProgress}%</span>
                  </div>
                  <Progress value={ordersProgress} className="h-2" />
                  {ordersStatus && (
                    <p className="text-xs text-muted-foreground">{ordersStatus}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSKUs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Sunsky supplier SKUs in database
            </p>
            {sunskySKUs.length > 0 && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {sunskySKUs.length.toLocaleString()} loaded
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PO Numbers</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePONumbers}</div>
            <p className="text-xs text-muted-foreground">
              Unique purchase orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total quantity in PO orders
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {totalOrderRecords.toLocaleString()} order records
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Items</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{matchedItemsQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Quantity of matched items
            </p>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {matchedItems.toLocaleString()} records matched
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingMatchedQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total quantity pending placement
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {pendingMatchedOrders.toLocaleString()} pending items
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock Items</CardTitle>
            <PackageCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inStockItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Items available in inventory
            </p>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Total qty: {totalInStockQuantity.toLocaleString()}
              </Badge>
              {totalItemsWithInventory > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {((inStockItems / totalItemsWithInventory) * 100).toFixed(1)}% covered
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{placedOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Items successfully placed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
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
            value="analytics" 
            className="relative h-10 px-6 text-sm font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 rounded-lg flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Profit Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="skus" 
            className="relative h-10 px-6 text-sm font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 rounded-lg flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            SKU Management
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
              <CardTitle>PO Order Tracking</CardTitle>
              <CardDescription>
                Track the status of purchase orders. Click on any row to view detailed information and manage tracking.
              </CardDescription>
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
                        <TableHead>Total Cost</TableHead>
                        <TableHead className="text-center">
                          <MousePointer className="h-4 w-4 mx-auto" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOGroups.map(([poNumber, orders]) => {
                        const matchedCount = orders.filter(order => order.sunsky_sku !== null).length;
                        const pendingCount = orders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).length;
                        const placedCount = orders.filter(order => order.status === 'ordered').length;
                        const shippedCount = orders.filter(order => order.status === 'shipped').length;
                        const deliveredCount = orders.filter(order => order.status === 'delivered').length;
                        
                        const totalCost = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
                        const currency = orders[0]?.currency || 'AED';
                        
                        // Get tracking numbers for this PO
                        const trackingNumbers = orders
                          .filter(order => order.tracking_number)
                          .map(order => ({
                            number: order.tracking_number,
                            url: order.tracking_url
                          }))
                          .filter((item, index, arr) => 
                            arr.findIndex(x => x.number === item.number) === index
                          );
                        
                        return (
                          <TableRow 
                            key={poNumber}
                            className={`transition-colors border-b-2 border-primary/20 ${
                              matchedCount > 0 
                                ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/40' 
                                : 'opacity-60 cursor-not-allowed bg-muted/20'
                            }`}
                            onClick={matchedCount > 0 ? () => handlePORowClick(poNumber) : undefined}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-mono font-bold text-primary text-lg">
                                  {poNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Ship to: {orders[0]?.ship_to_location || 'Not specified'}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell className="min-w-[300px]">
                              {matchedCount > 0 ? (
                                <div className="space-y-3">
                                  {/* Matched Items Progress */}
                                   <div className="space-y-1">
                                     <div className="flex justify-between items-center">
                                       <span className="text-xs font-medium text-blue-600">Matched Items</span>
                                       <span className="text-xs text-blue-600">{matchedCount}/{orders.length}</span>
                                     </div>
                                     <Progress 
                                       value={orders.length > 0 ? (matchedCount / orders.length) * 100 : 0} 
                                       className="h-2 [&>div]:bg-blue-500"
                                     />
                                   </div>
                                  
                                  {/* Placement Progress */}
                                  {matchedCount > 0 && (
                                     <div className="space-y-1">
                                       <div className="flex justify-between items-center">
                                         <span className="text-xs font-medium text-green-600">Placed/Shipped</span>
                                         <span className="text-xs text-green-600">{placedCount + shippedCount + deliveredCount}/{matchedCount}</span>
                                       </div>
                                       <Progress 
                                         value={matchedCount > 0 ? ((placedCount + shippedCount + deliveredCount) / matchedCount) * 100 : 0} 
                                         className="h-2 [&>div]:bg-green-500"
                                       />
                                     </div>
                                   )}
                                   
                                   {/* Inventory Stock Progress */}
                                   {matchedCount > 0 && (() => {
                                     // Calculate inventory stats for this specific PO group
                                     const poInventoryMatches = orders.map(order => ({
                                       ...order,
                                       inventoryMatch: findInventoryMatch(order.asin, order.sunsky_sku?.sku_code, order.sku_code)
                                     }));
                                     
                                     const poItemsWithInventory = poInventoryMatches.filter(item => item.inventoryMatch).length;
                                      const poInStockItems = poInventoryMatches.filter(item => 
                                        item.inventoryMatch && item.inventoryMatch.isActuallyInStock
                                      ).length;
                                      const poInStockQuantity = poInventoryMatches
                                        .filter(item => item.inventoryMatch && item.inventoryMatch.isActuallyInStock)
                                        .reduce((sum, item) => sum + (item.inventoryMatch?.quantity || 0), 0);
                                     
                                     return (
                                       <div className="space-y-1">
                                         <div className="flex justify-between items-center">
                                           <span className="text-xs font-medium text-orange-600">In Stock</span>
                                           <span className="text-xs text-orange-600">{poInStockItems}/{poItemsWithInventory}</span>
                                         </div>
                                         <Progress 
                                           value={poItemsWithInventory > 0 ? (poInStockItems / poItemsWithInventory) * 100 : 0} 
                                           className="h-2 [&>div]:bg-orange-500"
                                         />
                                         <div className="text-xs text-muted-foreground">
                                           Stock qty: {poInStockQuantity.toLocaleString()}
                                         </div>
                                       </div>
                                     );
                                   })()}
                                   
                                   {/* Status Summary */}
                                  <div className="flex flex-wrap gap-1">
                                    {pendingCount > 0 && (
                                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                        {pendingCount} pending
                                      </Badge>
                                    )}
                                    {placedCount > 0 && (
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                        {placedCount} placed
                                      </Badge>
                                    )}
                                    {shippedCount > 0 && (
                                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                        {shippedCount} shipped
                                      </Badge>
                                    )}
                                    {deliveredCount > 0 && (
                                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        {deliveredCount} delivered
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="text-muted-foreground text-sm">
                                    No items found in SKU catalog
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Upload matching SKUs to enable tracking
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            
                            <TableCell className="min-w-[200px]">
                              {matchedCount > 0 ? (
                                <div className="space-y-2">
                                  {trackingNumbers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {trackingNumbers.map((tracking, index) => (
                                        tracking.url ? (
                                          <a
                                            key={index}
                                            href={tracking.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs font-medium transition-colors border border-primary/20 hover:border-primary/40"
                                          >
                                            📦 {tracking.number}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ) : (
                                          <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium border"
                                          >
                                            📦 {tracking.number}
                                          </span>
                                        )
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No tracking info</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <span className="text-xs text-muted-foreground">Tracking unavailable</span>
                                </div>
                              )}
                            </TableCell>
                            
                            <TableCell className="font-semibold">
                              {totalCost > 0 ? `${totalCost.toFixed(2)} ${currency}` : '-'}
                            </TableCell>
                            
                            <TableCell className="text-center">
                              {matchedCount > 0 ? (
                                <Eye className="h-4 w-4 text-muted-foreground mx-auto" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                              )}
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
          <POProfitAnalytics poOrders={poOrders} sunskySKUs={sunskySKUs} />
        </TabsContent>

        <TabsContent value="skus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sunsky SKU Database</span>
                <Badge variant="outline">
                  {sunskySKUs.length} / {totalCount} loaded
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage SKUs for Sunsky supplier. Add new SKUs or search existing ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search SKUs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <ShippingRateDialog 
                  currentRate={shippingRate} 
                  onUpdateRate={handleUpdateShippingRate} 
                  isLoading={isUpdatingRate} 
                />
                <AddSKUDialog onAddSKUs={addSKUs} isLoading={skuLoading} />
              </div>
              
              <SKUList 
                skus={filteredSKUs} 
                shippingRate={shippingRate} 
                isLoading={skuLoading}
                hasMore={hasMoreSKUs}
                onLoadMore={loadMoreSKUs}
                onSkuUpdated={refreshSKUs}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}