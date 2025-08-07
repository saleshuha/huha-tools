import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Package, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { POFileUpload } from './po/POFileUpload';
import { SKUList } from './po/SKUList';
import { POOrderTracking } from './po/POOrderTracking';
import { AddSKUDialog } from './po/AddSKUDialog';
import { POProfitAnalytics } from './po/POProfitAnalytics';
import { ShippingRateDialog } from './po/ShippingRateDialog';
import { useSKUManager } from '@/hooks/useSKUManager';
import { usePOOrders } from '@/hooks/usePOOrders';

export function POTracker() {
  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [shippingRate, setShippingRate] = useState(0.005); // Default: 0.005 AED per gram
  
  // Separate hooks for different functionalities
  const {
    sunskySKUs,
    isLoading: skuLoading,
    loadingProgress: skuProgress,
    loadingStatus: skuStatus,
    totalCount,
    hasMoreSKUs,
    fetchSKUs,
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

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'skus' && sunskySKUs.length === 0) {
      fetchSKUs();
    } else if ((activeTab === 'upload' || activeTab === 'tracking' || activeTab === 'analytics') && poOrders.length === 0) {
      fetchPOOrders();
    }
  }, [activeTab, sunskySKUs.length, poOrders.length, fetchSKUs, fetchPOOrders]);

  const handleFileUpload = async (mappedData: any[]) => {
    try {
      await processPOFiles(mappedData, sunskySKUs);
    } catch (error) {
      console.error('Error processing PO files:', error);
    }
  };

  const updateShippingRate = (rate: number) => {
    setShippingRate(rate);
  };

  const refreshData = () => {
    if (activeTab === 'skus') {
      refreshSKUs();
    } else {
      fetchPOOrders();
    }
  };

  const filteredSKUs = sunskySKUs.filter(sku => 
    sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalSKUs = sunskySKUs.length;
  const totalOrders = poOrders.length;
  const pendingOrders = poOrders.filter(order => order.status === 'pending').length;
  const placedOrders = poOrders.filter(order => order.status === 'ordered').length;

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSKUs}</div>
            <p className="text-xs text-muted-foreground">
              Sunsky supplier SKUs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PO Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Purchase orders tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting placement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{placedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Orders with supplier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SKU Database</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sunskySKUs.length}</div>
            <p className="text-xs text-muted-foreground">
              of {totalCount.toLocaleString()} total SKUs loaded
            </p>
            {hasMoreSKUs && (
              <Badge variant="outline" className="mt-1 text-xs">
                {((sunskySKUs.length / totalCount) * 100).toFixed(1)}% loaded
              </Badge>
            )}
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
                Track the status of purchase orders - which items are placed, pending, or need attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <POOrderTracking 
                orders={poOrders} 
                onUpdateStatus={updateOrderStatus}
                onUpdateTracking={updateTrackingInfo}
                isLoading={ordersLoading}
              />
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
                  onUpdateRate={updateShippingRate} 
                  isLoading={skuLoading} 
                />
                <AddSKUDialog onAddSKUs={addSKUs} isLoading={skuLoading} />
              </div>
              
              <SKUList 
                skus={filteredSKUs} 
                shippingRate={shippingRate} 
                isLoading={skuLoading}
                hasMore={hasMoreSKUs}
                onLoadMore={loadMoreSKUs}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}