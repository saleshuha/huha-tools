import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Search, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw, Eye, MousePointer, Truck, ExternalLink, PackageCheck, Archive, Copy, Package } from 'lucide-react';
import { POFileUpload } from './po/POFileUpload';
import { POProfitAnalytics } from './po/POProfitAnalytics';
import { BulkPOProcessor } from './po/BulkPOProcessor';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function POTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inventoryData, setInventoryData] = useState<{asinInventory: any[]}>({
    asinInventory: []
  });
  const { profile } = useUserProfile();
  const { toast } = useToast();

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
      const [asinResult] = await Promise.all([
        supabase
          .from('asin_inventory')
          .select('asin, quantity, status, sku')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      ]);

      if (asinResult.error) throw asinResult.error;

      setInventoryData({
        asinInventory: asinResult.data || []
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  // Enhanced inventory matching function with ASIN checking
  const findInventoryMatch = (asin: string) => {
    console.log(`🔍 POTracker - Finding inventory match for:`, { asin });
    
    // Try ASIN first in ASIN inventory
    if (asin) {
      const asinMatch = inventoryData.asinInventory.find(item => item.asin === asin);
      if (asinMatch) {
        console.log(`✅ Found ASIN match in asin_inventory:`, asinMatch);
        return {
          type: 'ASIN',
          status: asinMatch.status,
          quantity: asinMatch.quantity,
          identifier: asinMatch.asin
        };
      }
    }

    console.log(`❌ No inventory match found for any identifier`);
    return null;
  };

  // Simple function to check if item is truly in stock
  const isItemInStock = (inventoryMatch: any) => {
    if (!inventoryMatch) return false;
    return inventoryMatch.status === 'in-stock' && inventoryMatch.quantity > 0;
  };

  // Load data based on active tab
  useEffect(() => {
    fetchInventoryData(); // Always fetch inventory data for proper metrics
    
    if (poOrders.length === 0) {
      fetchPOOrders();
    }
  }, [activeTab, poOrders.length, fetchPOOrders]);

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

  // Filter out closed POs for active metrics
  const activePOOrders = poOrders.filter(order => order.status !== 'closed');

  // Calculate accurate metrics based on database matching (active POs only)
  const totalOrderRecords = activePOOrders.length;
  const totalItemsQuantity = activePOOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
  const uniquePONumbers = new Set(activePOOrders.map(order => order.po_number)).size;
  
  // Pending orders - all orders with status 'pending' (from active POs only)
  const pendingOrders = activePOOrders.filter(order => order.status === 'pending').length;
  
  // Pending quantity - total quantity of items that are still pending (from active POs only)
  const pendingQuantity = activePOOrders
    .filter(order => order.status === 'pending')
    .reduce((sum, order) => sum + (order.quantity || 0), 0);
  
  // Placed orders - all orders with status 'ordered' (from active POs only)
  const placedOrders = activePOOrders.filter(order => order.status === 'ordered').length;

  // Only count items that have stock > 0 from active POs only
  const getItemsWithStock = () => {
    if (!activePOOrders || activePOOrders.length === 0) return { count: 0, totalQty: 0 };
    
    let count = 0;
    let totalQty = 0;
    
    console.log('Total Active PO Orders:', activePOOrders.length);
    
    for (const order of activePOOrders) {
      let foundStock = false;
      
      // Check ASIN inventory
      if (order.asin && inventoryData.asinInventory) {
        for (const asinItem of inventoryData.asinInventory) {
          if (asinItem.asin === order.asin && asinItem.quantity > 0) {
            count++;
            totalQty += asinItem.quantity;
            foundStock = true;
            break;
          }
        }
      }
    }
    
    console.log('Items with stock > 0:', count);
    console.log('Total stock quantity:', totalQty);
    
    return { count, totalQty };
  };

  // Count items with any inventory data (for percentage calculation)
  const getItemsWithInventory = () => {
    if (!poOrders || poOrders.length === 0) return 0;
    
    let count = 0;
    
    for (const order of poOrders) {
      let hasInventory = false;
      
      // Check ASIN inventory
      if (order.asin && inventoryData.asinInventory) {
        for (const asinItem of inventoryData.asinInventory) {
          if (asinItem.asin === order.asin) {
            count++;
            hasInventory = true;
            break;
          }
        }
      }
    }
    
    return count;
  };

  // Get counts for items
  const stockResults = getItemsWithStock();
  const inventoryResults = getItemsWithInventory();
  
  // Assign results to variables used throughout the component
  const totalItemsWithInventory = inventoryResults;
  const inStockItems = stockResults.count;
  const totalInStockQuantity = stockResults.totalQty;

  // Group orders by PO number for the tracking table
  const groupedPOOrders = poOrders.reduce((groups, order) => {
    const poNumber = order.po_number;
    if (!groups[poNumber]) {
      groups[poNumber] = [];
    }
    groups[poNumber].push(order);
    return groups;
  }, {} as Record<string, typeof poOrders>);

  // Separate active and closed POs
  const activePOGroups = Object.entries(groupedPOOrders).filter(([poNumber, orders]) => 
    !orders.every(order => order.status === 'closed')
  );
  
  const closedPOGroups = Object.entries(groupedPOOrders).filter(([poNumber, orders]) => 
    orders.every(order => order.status === 'closed')
  );

  // Filter grouped orders based on search and status  
  const filterPOGroups = (groups: [string, typeof poOrders][]) => {
    return groups
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
      // Sort groups by PO number
      .sort(([poA], [poB]) => poA.localeCompare(poB));
  };

  const filteredPOGroups = filterPOGroups(activePOGroups);
  const filteredClosedPOGroups = filterPOGroups(closedPOGroups);

  const handlePORowClick = (poNumber: string) => {
    navigate(`/po-details/${encodeURIComponent(poNumber)}`);
  };

  // Handle marking PO as delivered and closed
  const handleMarkPODeliveredAndClosed = async (poNumber: string) => {
    try {
      const { error } = await supabase
        .from('po_orders')
        .update({ status: 'closed' })
        .eq('po_number', poNumber)
        .in('status', ['delivered', 'shipped']);

      if (error) throw error;

      toast({
        title: "Success",
        description: `PO ${poNumber} has been closed`,
      });

      // Refresh data
      await fetchPOOrders();
    } catch (error) {
      console.error('Error closing PO:', error);
      toast({
        title: "Error",
        description: "Failed to close PO",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-width-screen-xl mx-auto space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PO Tracker</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and track inventory status
          </p>
        </div>
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

      {/* Progress Bars */}
      {ordersLoading && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="space-y-4">
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-purple-500 bg-purple-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active PO Numbers</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{uniquePONumbers}</div>
            <p className="text-xs text-muted-foreground">
              Active purchase orders (excluding closed)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{totalItemsQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total quantity in active PO orders
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {totalOrderRecords.toLocaleString()} active order records
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Quantity pending placement (active POs)
            </p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {pendingOrders.toLocaleString()} pending active items
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock Items</CardTitle>
            <PackageCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {inStockItems.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active items with available stock
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
            <div className="text-2xl font-bold text-emerald-600">{placedOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active items successfully placed
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
                Upload PO files (Excel/CSV) to track orders. Supports single or multiple files.
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
                        <TableHead className="text-center">
                          <MousePointer className="h-4 w-4 mx-auto" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOGroups.map(([poNumber, orders]) => {
                        const pendingCount = orders.filter(order => order.status === 'pending').length;
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
                            className="transition-colors border-b-2 border-primary/20 cursor-pointer hover:bg-muted/50 hover:border-primary/40"
                            onClick={() => handlePORowClick(poNumber)}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-mono font-bold text-primary text-lg">
                                    {poNumber}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(poNumber);
                                      toast({
                                        title: "Copied!",
                                        description: `PO number ${poNumber} copied to clipboard`,
                                      });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Ship to: {orders[0]?.ship_to_location || 'Not specified'}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell className="min-w-[300px]">
                              <div className="space-y-3">
                                {/* Placement Progress */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-green-600">Placed/Shipped</span>
                                    <span className="text-xs text-green-600">{placedCount + shippedCount + deliveredCount}/{orders.length}</span>
                                  </div>
                                  <Progress 
                                    value={orders.length > 0 ? ((placedCount + shippedCount + deliveredCount) / orders.length) * 100 : 0} 
                                    className="h-2 [&>div]:bg-green-500"
                                  />
                                </div>
                                
                                {/* Inventory Stock Progress */}
                                {(() => {
                                  let poItemsWithStock = 0;
                                  let poTotalStockQty = 0;
                                  let poItemsWithInventory = 0;
                                  
                                  for (const order of orders) {
                                    let foundInventory = false;
                                    let foundStock = false;
                                    
                                    // Check ASIN inventory
                                    if (order.asin && inventoryData.asinInventory) {
                                      for (const asinItem of inventoryData.asinInventory) {
                                        if (asinItem.asin === order.asin) {
                                          foundInventory = true;
                                          if (asinItem.quantity > 0) {
                                            foundStock = true;
                                            poTotalStockQty += asinItem.quantity;
                                          }
                                          break;
                                        }
                                      }
                                    }
                                    
                                    if (foundInventory) poItemsWithInventory++;
                                    if (foundStock) poItemsWithStock++;
                                  }
                                   
                                   return (
                                     <div className="space-y-1">
                                       <div className="flex justify-between items-center">
                                         <span className="text-xs font-medium text-orange-600">In Stock</span>
                                         <span className="text-xs text-orange-600">{poItemsWithStock}/{poItemsWithInventory}</span>
                                       </div>
                                       <Progress 
                                         value={poItemsWithInventory > 0 ? (poItemsWithStock / poItemsWithInventory) * 100 : 0} 
                                         className="h-2 [&>div]:bg-orange-500"
                                       />
                                       <div className="text-xs text-muted-foreground">
                                         Stock qty: {poTotalStockQty.toLocaleString()}
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
                            </TableCell>
                            
                            <TableCell className="min-w-[200px]">
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
                            </TableCell>
                            
                            <TableCell>
                              {deliveredCount > 0 ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkPODeliveredAndClosed(poNumber);
                                  }}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Close PO
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  {pendingCount > 0 ? 'Pending' : 
                                   placedCount > 0 ? 'In Progress' : 
                                   shippedCount > 0 ? 'Shipped' : 'No Activity'}
                                </Badge>
                              )}
                            </TableCell>
                            
                            <TableCell className="text-center">
                              <Eye className="h-4 w-4 text-muted-foreground mx-auto" />
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
                View completed and closed purchase orders. These POs are no longer available for matching.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Controls for Closed POs */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search closed PO numbers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Closed PO Orders Table */}
              {ordersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading closed orders...</span>
                </div>
              ) : filteredClosedPOGroups.length === 0 ? (
                <div className="text-center py-16">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Closed PO Orders</h3>
                  <p className="text-muted-foreground">Closed POs will appear here once you mark them as completed.</p>
                </div>
              ) : (
                <div className="border-2 border-primary/20 rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-primary/30">
                        <TableHead>PO Details</TableHead>
                        <TableHead>Items Summary</TableHead>
                        <TableHead>Tracking Info</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClosedPOGroups.map(([poNumber, orders]) => {
                        const totalItems = orders.length;
                        const closedItems = orders.filter(order => order.status === 'closed').length;
                        
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
                            className="transition-colors border-b-2 border-primary/20 bg-muted/10"
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-mono font-bold text-primary text-lg">
                                  {poNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Ship to: {orders[0]?.ship_to_location || 'Not specified'}
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                  <Archive className="h-3 w-3 mr-1" />
                                  Closed
                                </Badge>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="space-y-2">
                                <div className="text-sm">
                                  <span className="font-medium">{totalItems}</span> total items
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-green-600">{closedItems}</span> closed items
                                </div>
                                <Progress 
                                  value={totalItems > 0 ? (closedItems / totalItems) * 100 : 0} 
                                  className="h-2 [&>div]:bg-green-500"
                                />
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              {trackingNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {trackingNumbers.map((tracking, index) => (
                                    tracking.url ? (
                                      <a
                                        key={index}
                                        href={tracking.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
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
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
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
          <POProfitAnalytics poOrders={poOrders} sunskySKUs={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
