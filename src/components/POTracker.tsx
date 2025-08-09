import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Search, Package, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw, Eye, MousePointer, Truck, ExternalLink } from 'lucide-react';
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
    await fetchPOOrders();
  };

  // Load data based on active tab
  useEffect(() => {
    fetchSKUCount();
    
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
  const totalOrders = poOrders.length;
  const uniquePONumbers = new Set(poOrders.map(order => order.po_number)).size;
  
  // Matched items - use database-level matching (items with sunsky_sku populated)
  const matchedItems = poOrders.filter(order => order.sunsky_sku !== null).length;
  
  // Pending matched orders - matched items that are still pending
  const pendingMatchedOrders = poOrders.filter(order => 
    order.status === 'pending' && order.sunsky_sku !== null
  ).length;
  
  // Placed orders - all orders with status 'ordered'
  const placedOrders = poOrders.filter(order => order.status === 'ordered').length;

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
  const filteredPOGroups = Object.entries(groupedPOOrders).filter(([poNumber, orders]) => {
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
  });

  const handlePORowClick = (poNumber: string) => {
    navigate(`/po-details/${encodeURIComponent(poNumber)}`);
  };

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Individual PO items
            </p>
            {poOrders.length !== totalOrders && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {poOrders.length.toLocaleString()} loaded
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Items</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{matchedItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Items found in SKU catalog
            </p>
            {totalOrders > 0 && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {((matchedItems / totalOrders) * 100).toFixed(1)}% match rate
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingMatchedOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Matched items pending placement
            </p>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">PO Upload</TabsTrigger>
          <TabsTrigger value="tracking">Order Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Profit Analytics</TabsTrigger>
          <TabsTrigger value="skus">SKU Management</TabsTrigger>
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
              {/* Progress Preview */}
              <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Order Progress Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Matched Items Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary">Matched Items</span>
                        <span className="text-sm font-bold text-primary">{matchedItems}/{totalOrders}</span>
                      </div>
                      <Progress 
                        value={totalOrders > 0 ? (matchedItems / totalOrders) * 100 : 0} 
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        {totalOrders > 0 ? ((matchedItems / totalOrders) * 100).toFixed(1) : 0}% items found in SKU catalog
                      </p>
                    </div>

                    {/* Placed Items Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-600">Placed Orders</span>
                        <span className="text-sm font-bold text-blue-600">{placedOrders}/{matchedItems}</span>
                      </div>
                      <Progress 
                        value={matchedItems > 0 ? (placedOrders / matchedItems) * 100 : 0} 
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        {matchedItems > 0 ? ((placedOrders / matchedItems) * 100).toFixed(1) : 0}% of matched items placed
                      </p>
                    </div>

                    {/* Pending Items Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-yellow-600">Pending Items</span>
                        <span className="text-sm font-bold text-yellow-600">{pendingMatchedOrders}/{matchedItems}</span>
                      </div>
                      <Progress 
                        value={matchedItems > 0 ? (pendingMatchedOrders / matchedItems) * 100 : 0} 
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        {matchedItems > 0 ? ((pendingMatchedOrders / matchedItems) * 100).toFixed(1) : 0}% items awaiting placement
                      </p>
                    </div>
                  </div>

                  {/* Tracking Numbers */}
                  {poOrders.some(order => order.tracking_number || order.tracking_url) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Active Tracking Numbers
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(
                          poOrders
                            .filter(order => order.tracking_number && order.tracking_url)
                            .map(order => ({ number: order.tracking_number, url: order.tracking_url }))
                            .filter((item, index, arr) => 
                              arr.findIndex(x => x.number === item.number) === index
                            )
                        )).map((tracking, index) => (
                          <a
                            key={index}
                            href={tracking.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-medium transition-colors border border-primary/20 hover:border-primary/40"
                          >
                            📦 {tracking.number}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                        {Array.from(new Set(
                          poOrders
                            .filter(order => order.tracking_number && !order.tracking_url)
                            .map(order => order.tracking_number)
                        )).map((trackingNumber, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium border"
                          >
                            📦 {trackingNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Matched</TableHead>
                        <TableHead>Status Summary</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead className="text-center">
                          <MousePointer className="h-4 w-4 mx-auto" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPOGroups.map(([poNumber, orders]) => {
                        const matchedCount = orders.filter(order => order.sunsky_sku !== null).length;
                        
                        const statusCounts = orders.reduce((acc, order) => {
                          acc[order.status] = (acc[order.status] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        
                        const totalCost = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
                        const currency = orders[0]?.currency || 'AED';
                        
                        return (
                          <TableRow 
                            key={poNumber}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handlePORowClick(poNumber)}
                          >
                            <TableCell className="font-mono font-medium text-primary">
                              {poNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{orders.length} items</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant={matchedCount > 0 ? "default" : "secondary"}>
                                  {matchedCount} matched
                                </Badge>
                                {matchedCount < orders.length && (
                                  <Badge variant="destructive">
                                    {orders.length - matchedCount} unmatched
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(statusCounts).map(([status, count]) => (
                                  <Badge 
                                    key={status} 
                                    variant={status === 'delivered' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {count} {status}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {totalCost > 0 ? `${totalCost.toFixed(2)} ${currency}` : '-'}
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