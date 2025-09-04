import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NoonOrdersUpload } from '@/components/NoonOrdersUpload';
import { NoonOrdersTable } from '@/components/NoonOrdersTable';
import { NoonStoreManagement } from '@/components/NoonStoreManagement';
import { SunskyOrderPlacement } from '@/components/SunskyOrderPlacement';
import { SunskyOrderTracking } from '@/components/SunskyOrderTracking';
import { NoonOrderDetailDrawer } from '@/components/noon/NoonOrderDetailDrawer';
import { AutoProcessingStatus } from '@/components/AutoProcessingStatus';
import { TrackingToolbar } from '@/components/noon/tracking/TrackingToolbar';
import { StatusMetricsCards } from '@/components/noon/tracking/StatusMetricsCards';
import { ExceptionsDrawer } from '@/components/noon/tracking/ExceptionsDrawer';
import { EnhancedOrdersPipeline } from '@/components/noon/tracking/EnhancedOrdersPipeline';
import { useNoonOrders, NoonOrder } from '@/hooks/useNoonOrders';
import { useNoonStores } from '@/hooks/useNoonStores';
import { useSunskyCredentials } from '@/hooks/useSunskyCredentials';
import { useToast } from '@/hooks/use-toast';
export default function NoonOrderTrackingPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedCredentialsId, setSelectedCredentialsId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<NoonOrder | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showExceptions, setShowExceptions] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    storeId: 'all-stores',
    dateRange: 'all'
  });
  const {
    orders,
    loading,
    refreshOrders,
    updateOrderStatus,
    syncOrderStatus,
    placeOrderWithSunsky,
    getOrdersByStatus
  } = useNoonOrders();
  const {
    stores
  } = useNoonStores();
  const {
    credentials
  } = useSunskyCredentials();
  const {
    toast
  } = useToast();

  // Debug logging and sample data for demonstration
  React.useEffect(() => {
    console.log('🔍 NoonOrderTracking Debug:', {
      ordersLength: orders?.length || 0,
      loading,
      orders: orders?.slice(0, 2),
      // Log first 2 orders for debugging
      storesLength: stores?.length || 0,
      credentialsLength: credentials?.length || 0
    });
  }, [orders, loading, stores, credentials]);

  // Create sample data for demonstration when no orders exist
  const sampleOrders = React.useMemo(() => {
    if (orders.length > 0) return orders;

    // Return sample orders for demonstration
    return [{
      id: 'sample-1',
      order_nr: 'DEMO-001',
      title: 'Sample Product - Wireless Headphones',
      partner_sku: 'WH-001-BLK',
      quantity: 2,
      order_status: 'uploaded',
      created_at: new Date().toISOString(),
      selected_store_id: 'demo-store',
      user_id: 'demo-user'
    }, {
      id: 'sample-2',
      order_nr: 'DEMO-002',
      title: 'Sample Product - Phone Case',
      partner_sku: 'PC-002-RED',
      quantity: 1,
      order_status: 'ready',
      created_at: new Date().toISOString(),
      selected_store_id: 'demo-store',
      user_id: 'demo-user'
    }, {
      id: 'sample-3',
      order_nr: 'DEMO-003',
      title: 'Sample Product - Laptop Stand',
      partner_sku: 'LS-003-SLV',
      quantity: 1,
      order_status: 'placed',
      sunsky_order_number: 'SK123456',
      created_at: new Date().toISOString(),
      selected_store_id: 'demo-store',
      user_id: 'demo-user'
    }] as NoonOrder[];
  }, [orders]);

  // Filter orders based on current search and filters
  const filteredOrders = React.useMemo(() => {
    return sampleOrders.filter(order => {
      // Search filter - combine toolbar search with filters search
      const searchQuery = searchTerm || filters.search;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matches = [order.order_nr, order.purchase_item_nr, order.partner_sku, order.sku, order.title].some(field => field?.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const orderStatus = order.order_status || 'uploaded';
        if (orderStatus !== filters.status) return false;
      }

      // Store filter
      if (filters.storeId && filters.storeId !== 'all-stores' && order.selected_store_id !== filters.storeId) {
        return false;
      }

      // Date range filter
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
  }, [sampleOrders, filters, searchTerm]);

  // Calculate status metrics
  const statusMetrics = React.useMemo(() => {
    const metrics = {
      uploaded: 0,
      ready: 0,
      placed: 0,
      shipped: 0,
      delivered: 0,
      exception: 0,
      total: filteredOrders.length
    };
    filteredOrders.forEach(order => {
      const status = order.order_status || 'uploaded';
      if (metrics.hasOwnProperty(status)) {
        (metrics as any)[status]++;
      } else {
        metrics.uploaded++; // Default fallback
      }
    });
    return metrics;
  }, [filteredOrders]);

  // Get exception orders
  const exceptionOrders = filteredOrders.filter(order => order.order_status === 'exception' || !order.partner_sku || order.quantity <= 0 || order.sunsky_error_message);
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
          description: 'Sunsky order linked successfully'
        });
        setShowOrderDetail(false);
      } catch (error) {
        console.error('Error linking order:', error);
        toast({
          title: 'Error',
          description: 'Failed to link Sunsky order',
          variant: 'destructive'
        });
      }
    }
  };
  const handleSyncOrder = async (orderId: string) => {
    try {
      await syncOrderStatus(orderId);
      toast({
        title: 'Success',
        description: 'Order synced with Sunsky'
      });
    } catch (error) {
      console.error('Error syncing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync order',
        variant: 'destructive'
      });
    }
  };
  const handleOrderView = (order: NoonOrder) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };
  const handleOrderMove = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, {
        order_status: newStatus
      });
      toast({
        title: 'Success',
        description: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    }
  };
  const handleExport = () => {
    // Export functionality - would implement CSV/Excel export
    toast({
      title: 'Export',
      description: 'Export functionality coming soon'
    });
  };
  const handleShowAnalytics = () => {
    // Navigate to analytics view or show analytics modal
    toast({
      title: 'Analytics',
      description: 'Analytics view coming soon'
    });
  };
  const handleResolveException = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, {
        order_status: 'uploaded',
        sunsky_error_message: null
      });
      toast({
        title: 'Success',
        description: 'Exception resolved successfully'
      });
    } catch (error) {
      console.error('Error resolving exception:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve exception',
        variant: 'destructive'
      });
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Enhanced Hero Header Section */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-float-delayed" />
        
        
      </div>

      {/* Enhanced Toolbar */}
      <TrackingToolbar searchTerm={searchTerm} onSearchChange={setSearchTerm} selectedStore={selectedStoreId} onStoreChange={setSelectedStoreId} selectedCredentials={selectedCredentialsId} onCredentialsChange={setSelectedCredentialsId} viewMode={viewMode} onViewModeChange={setViewMode} onRefresh={refreshOrders} onExport={handleExport} onShowExceptions={() => setShowExceptions(true)} onShowAnalytics={handleShowAnalytics} loading={loading} totalOrders={sampleOrders.length} filteredOrders={filteredOrders.length} exceptionCount={exceptionOrders.length} stores={stores} credentials={credentials} />

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Auto-Processing Status */}
        <AutoProcessingStatus orders={sampleOrders} />

        {/* Demo Notice */}
        {orders.length === 0 && <div className="bg-gradient-to-r from-amber/20 to-orange/20 border border-amber/30 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber/20 rounded-lg">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Demo Mode Active</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your orders database is empty. Showing sample data to demonstrate the enhanced UI. Upload orders via the "Upload Orders" tab to see your actual data.
                </p>
              </div>
            </div>
          </div>}

        {/* Status Metrics Cards */}
        <StatusMetricsCards metrics={statusMetrics} className="animate-fade-in" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-card border border-border/50 shadow-soft">
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Orders Management
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Upload Orders
            </TabsTrigger>
            <TabsTrigger value="stores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Store Management
            </TabsTrigger>
            <TabsTrigger value="sunsky-place" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Place Sunsky Orders
            </TabsTrigger>
            <TabsTrigger value="sunsky-track" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Track Sunsky Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            {viewMode === 'table' ? <NoonOrdersTable selectedStoreId={selectedStoreId} onStoreChange={setSelectedStoreId} /> : <EnhancedOrdersPipeline orders={filteredOrders} onOrderMove={handleOrderMove} onOrderView={handleOrderView} className="animate-fade-in" />}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <NoonOrdersUpload selectedStoreId={selectedStoreId} onUploadComplete={() => setActiveTab('orders')} />
          </TabsContent>

          <TabsContent value="stores" className="space-y-6">
            <NoonStoreManagement selectedStoreId={selectedStoreId} onStoreChange={setSelectedStoreId} />
          </TabsContent>

          <TabsContent value="sunsky-place" className="space-y-6">
            <SunskyOrderPlacement selectedStoreId={selectedStoreId} onOrdersPlaced={() => setActiveTab('sunsky-track')} />
          </TabsContent>

          <TabsContent value="sunsky-track" className="space-y-6">
            <SunskyOrderTracking />
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Drawers */}
      <NoonOrderDetailDrawer order={selectedOrder} open={showOrderDetail} onOpenChange={setShowOrderDetail} onLinkSunskyOrder={handleLinkSunskyOrder} onSyncOrder={handleSyncOrder} />

      <ExceptionsDrawer open={showExceptions} onOpenChange={setShowExceptions} exceptions={exceptionOrders} onResolveException={handleResolveException} onViewOrder={handleOrderView} />
    </div>;
}