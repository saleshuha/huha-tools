import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { NoonOrdersUpload } from '@/components/NoonOrdersUpload';
import { NoonOrdersTable } from '@/components/NoonOrdersTable';
import { NoonStoreManagement } from '@/components/NoonStoreManagement';
import { SunskyOrderPlacement } from '@/components/SunskyOrderPlacement';
import { SunskyOrderTracking } from '@/components/SunskyOrderTracking';
import { NoonOrderPipeline } from '@/components/noon/NoonOrderPipeline';
import { NoonOrderDetailDrawer } from '@/components/noon/NoonOrderDetailDrawer';
import { NoonOrderFilters, FilterState } from '@/components/noon/NoonOrderFilters';
import { NoonExceptions } from '@/components/noon/NoonExceptions';
import { useNoonOrders, NoonOrder } from '@/hooks/useNoonOrders';
import { useNoonStores } from '@/hooks/useNoonStores';
import { useSunskyCredentials } from '@/hooks/useSunskyCredentials';
import { useToast } from '@/hooks/use-toast';

export default function NoonOrderTrackingPage() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedCredentialsId, setSelectedCredentialsId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<NoonOrder | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    storeId: '',
    dateRange: 'all',
  });

  const { orders, loading, refreshOrders, updateOrderStatus, syncOrderStatus, placeOrderWithSunsky } = useNoonOrders();
  const { stores } = useNoonStores();
  const { credentials } = useSunskyCredentials();
  const { toast } = useToast();

  // Filter orders based on current filters
  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = [
          order.order_nr,
          order.purchase_item_nr,
          order.partner_sku,
          order.sku,
          order.title,
        ].some(field => field?.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const orderStatus = order.order_status || 'uploaded';
        if (orderStatus !== filters.status) return false;
      }

      // Store filter
      if (filters.storeId && order.selected_store_id !== filters.storeId) {
        return false;
      }

      // Date range filter (simplified - could be enhanced)
      if (filters.dateRange !== 'all') {
        const orderDate = order.order_received_at ? new Date(order.order_received_at) : new Date(order.created_at);
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            if (orderDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (orderDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (orderDate < monthAgo) return false;
            break;
          case '3months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            if (orderDate < threeMonthsAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [orders, filters]);

  // Get exception orders
  const exceptionOrders = filteredOrders.filter(order => 
    order.order_status === 'exception' || 
    !order.partner_sku || 
    order.quantity <= 0 ||
    order.sunsky_error_message
  );

  const handleLinkSunskyOrder = async (orderId: string) => {
    const orderNumber = prompt('Enter Sunsky order number:');
    if (orderNumber) {
      try {
        await updateOrderStatus(orderId, { 
          sunsky_order_number: orderNumber,
          order_status: 'placed' 
        });
        toast({
          title: 'Success',
          description: 'Sunsky order linked successfully',
        });
        setShowOrderDetail(false);
      } catch (error) {
        console.error('Error linking order:', error);
        toast({
          title: 'Error',
          description: 'Failed to link Sunsky order',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSyncOrder = async (orderId: string) => {
    try {
      await syncOrderStatus(orderId);
      toast({
        title: 'Success',
        description: 'Order synced with Sunsky',
      });
    } catch (error) {
      console.error('Error syncing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync order',
        variant: 'destructive',
      });
    }
  };

  const handleOrderView = (order: NoonOrder) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto px-6 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="mr-2 h-2 w-2 rounded-full bg-blue-500"></span>
              Noon Orders Integration
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent sm:text-5xl">
              Noon Orders Tracking
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Upload and manage your noon orders with automated Sunsky integration for seamless order fulfillment
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8">
        {/* Shared Header Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} ({store.country})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCredentialsId} onValueChange={setSelectedCredentialsId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sunsky Credentials" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select Credentials</SelectItem>
                {credentials.map((cred) => (
                  <SelectItem key={cred.id} value={cred.id}>
                    {cred.name} ({cred.country})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshOrders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant="secondary">{filteredOrders.length} orders</Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="orders">Orders Management</TabsTrigger>
            <TabsTrigger value="upload">Upload Orders</TabsTrigger>
            <TabsTrigger value="stores">Store Management</TabsTrigger>
            <TabsTrigger value="sunsky-place">Place Sunsky Orders</TabsTrigger>
            <TabsTrigger value="sunsky-track">Track Sunsky Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <div className="space-y-4">
              <NoonOrderFilters
                filters={filters}
                onFiltersChange={setFilters}
                totalOrders={orders.length}
                filteredOrders={filteredOrders.length}
              />
              
              <NoonOrderPipeline
                orders={filteredOrders}
                onOrderView={handleOrderView}
              />
              
              {exceptionOrders.length > 0 && (
                <div className="mt-8">
                  <NoonExceptions
                    orders={exceptionOrders}
                    onOrderView={handleOrderView}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <NoonOrdersTable 
              selectedStoreId={selectedStoreId}
              onStoreChange={setSelectedStoreId}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <NoonOrdersUpload 
              selectedStoreId={selectedStoreId}
              onUploadComplete={() => setActiveTab('orders')}
            />
          </TabsContent>

          <TabsContent value="stores" className="space-y-6">
            <NoonStoreManagement 
              selectedStoreId={selectedStoreId}
              onStoreChange={setSelectedStoreId}
            />
          </TabsContent>

          <TabsContent value="sunsky-place" className="space-y-6">
            <SunskyOrderPlacement 
              selectedStoreId={selectedStoreId}
              onOrdersPlaced={() => setActiveTab('sunsky-track')}
            />
          </TabsContent>

          <TabsContent value="sunsky-track" className="space-y-6">
            <SunskyOrderTracking />
          </TabsContent>
        </Tabs>

        {/* Order Detail Drawer */}
        <NoonOrderDetailDrawer
          order={selectedOrder}
          open={showOrderDetail}
          onOpenChange={setShowOrderDetail}
          onLinkSunskyOrder={handleLinkSunskyOrder}
          onSyncOrder={handleSyncOrder}
        />
      </div>
    </div>
  );
}