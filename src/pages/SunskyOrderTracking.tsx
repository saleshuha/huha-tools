import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { useSunskyCredentials } from '@/hooks/useSunskyCredentials';
import { useCountry } from '@/contexts/CountryContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Package, RefreshCw, Clock, Truck, CheckCircle, AlertTriangle, AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DelayedItemsTab } from '@/components/sunsky/DelayedItemsTab';
import { StatusMetricsCards } from '@/components/sunsky/tracking/StatusMetricsCards';
import { TrackingToolbar } from '@/components/sunsky/tracking/TrackingToolbar';
import { EnhancedOrderCard } from '@/components/sunsky/tracking/EnhancedOrderCard';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { calculateOrderProgress } from '@/utils/sunsky-progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Status configurations for orders and items with Sunsky numeric status mapping
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  unpaid: 'bg-orange-100 text-orange-800 border-orange-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  api_error: 'bg-red-100 text-red-800 border-red-200',
  ordered: 'bg-blue-100 text-blue-800 border-blue-200',
  paid: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  ready_to_ship: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  out_of_stock: 'bg-red-100 text-red-800 border-red-200',
  delayed: 'bg-orange-100 text-orange-800 border-orange-200',
  // Numeric status mappings from Sunsky API
  '0': 'bg-orange-100 text-orange-800 border-orange-200', // Unpaid
  '1': 'bg-yellow-100 text-yellow-800 border-yellow-200', // Pending/Ordered
  '4': 'bg-blue-100 text-blue-800 border-blue-200', // Paid
  '5': 'bg-purple-100 text-purple-800 border-purple-200', // Shipped
  '6': 'bg-green-100 text-green-800 border-green-200', // Delivered
};

const statusIcons = {
  pending: Clock,
  unpaid: AlertTriangle,
  error: AlertCircle,
  api_error: AlertCircle,
  ordered: Package,
  paid: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: AlertCircle,
  ready_to_ship: Package,
  out_of_stock: AlertTriangle,
  delayed: AlertTriangle,
  // Numeric status mappings from Sunsky API
  '0': AlertTriangle, // Unpaid
  '1': Package, // Pending/Ordered
  '4': CheckCircle, // Paid
  '5': Truck, // Shipped
  '6': CheckCircle, // Delivered
};

// Map Sunsky numeric status to readable text
const getReadableStatus = (status: string | number): string => {
  const statusStr = String(status);
  switch (statusStr) {
    case '0': return 'unpaid';
    case '1': return 'ordered';
    case '4': return 'paid';
    case '5': return 'shipped';
    case '6': return 'delivered';
    case 'unpaid': return 'unpaid';
    case 'api_error': return 'api error';
    case 'error': return 'error';
    default: return statusStr;
  }
};

interface SlowItem {
  order_number: string;
  sku_code: string;
  title: string;
  item_status: string;
  days_in_status: number;
  expected_ship_date: string;
  created_at: string;
}

export default function SunskyOrderTrackingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [slowItems, setSlowItems] = useState<SlowItem[]>([]);
  const [loadingLabels, setLoadingLabels] = useState<Set<string>>(new Set());
  const [orderLabels, setOrderLabels] = useState<Map<string, any[]>>(new Map());
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { selectedCountry } = useCountry();
  const { credentials } = useSunskyCredentials();
  const {
    orders,
    loading,
    syncing,
    progressCurrent,
    progressTotal,
    progressPercent,
    fetchStoredOrders,
    syncOrdersFromAPI,
    getOrderDetails,
    getOrderLabels,
    getSlowItems
  } = useSunskyOrders();

  const { toast } = useToast();

  // Filter and sort orders with enhanced logic
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items?.some(item => 
          item.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchesSearch;
    });

    // Sort by most recent
    filtered.sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at).getTime();
      const bDate = new Date(b.updated_at || b.created_at).getTime();
      return bDate - aDate;
    });

    return filtered;
  }, [orders, searchTerm]);

  // Pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, endIndex);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  // Load slow items
  const loadSlowItems = async () => {
    const items = await getSlowItems(3);
    setSlowItems(items);
  };

  // Load slow items on mount
  useEffect(() => {
    loadSlowItems();
  }, []);

  useEffect(() => {
    // Always fetch all available orders from Sunsky
    fetchStoredOrders(false);
    loadSlowItems();
  }, []);

  // Toggle order expansion and fetch items if missing using correct credential
  const toggleOrderExpansion = async (orderNumber: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
      
      // Find the order and its credential ID
      const order = orders.find(o => o.number === orderNumber);
      const credentialId = order?.sunsky_credentials_id;
      
      // Fetch order details if items are missing, using the correct credential
      if (!order?.items || order.items.length === 0) {
        await getOrderDetails(orderNumber, true, credentialId);
      }
    }
    
    setExpandedOrders(newExpanded);
  };

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency helper  
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Get status badge component
  const getStatusBadge = (status: string | number, isDelayed?: boolean) => {
    const readableStatus = getReadableStatus(status);
    const displayStatus = isDelayed ? 'delayed' : String(status);
    const displayText = isDelayed ? 'Delayed' : readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1);
    
    const IconComponent = statusIcons[displayStatus as keyof typeof statusIcons] || AlertCircle;
    const colorClass = statusColors[displayStatus as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={`${colorClass} flex items-center gap-1 w-fit border`}>
        <IconComponent className="h-3 w-3" />
        {displayText}
      </Badge>
    );
  };

  // Check if item is delayed (>3 days in current status)
  const isItemDelayed = (item: any) => {
    if (item.item_status === 'shipped' || item.item_status === 'delivered') return false;
    
    const statusDate = item.status_last_updated_at || item.created_at;
    if (!statusDate) return false;
    
    const daysSinceUpdate = Math.floor((Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate > 3;
  };

  // Handle tracking link click
  const handleTrackingClick = (url: string) => {
    window.open(url, '_blank');
  };

  // Handle labels fetch
  const handleGetLabels = async (orderNumber: string) => {
    setLoadingLabels(prev => new Set(prev).add(orderNumber));
    try {
      const labels = await getOrderLabels(orderNumber);
      setOrderLabels(prev => new Map(prev).set(orderNumber, labels || []));
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    } finally {
      setLoadingLabels(prev => {
        const updated = new Set(prev);
        updated.delete(orderNumber);
        return updated;
      });
    }
  };

  // Order statistics with proper status mapping
  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => {
      const status = getReadableStatus(o.status || '1');
      return status === 'ordered' || status === 'pending' || String(o.status) === '1';
    }).length,
    unpaid: orders.filter(o => {
      const status = getReadableStatus(o.status || '0');
      return status === 'unpaid' || String(o.status) === '0';
    }).length,
    paid: orders.filter(o => {
      const status = getReadableStatus(o.status || '4');
      return status === 'paid' || String(o.status) === '4';
    }).length,
    shipped: orders.filter(o => {
      const status = getReadableStatus(o.status || '5');
      return status === 'shipped' || String(o.status) === '5';
    }).length,
    delivered: orders.filter(o => {
      const status = getReadableStatus(o.status || '6');
      return status === 'delivered' || String(o.status) === '6';
    }).length,
    totalValue: orders.reduce((sum, order) => sum + (order.total || 0), 0)
  };

  const delayedCount = filteredAndSortedOrders.filter(order =>
    order.items?.some(item => isItemDelayed(item))
  ).length;

  // Clear all orders function
  const handleClearOrders = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${orders.length} synced orders? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sunsky_orders')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      // Also clear items
      await supabase
        .from('sunsky_order_items')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      toast({
        title: 'Success',
        description: `All ${orders.length} orders have been deleted from the database.`,
      });

      // Refresh the orders list
      await fetchStoredOrders(false);
    } catch (error: any) {
      console.error('Error clearing orders:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear orders',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Enhanced Hero Header Section */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-float-delayed" />
        
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
              <Package className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Sunsky Order Tracking
              </h1>
              <p className="text-muted-foreground">
                Track all Sunsky orders and monitor item delivery status for {selectedCountry}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Progress bar for syncing */}
        {syncing && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Fetching orders from Sunsky API...
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                {progressCurrent}/{progressTotal} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Status Metrics Cards */}
        <StatusMetricsCards metrics={orderStats} className="animate-fade-in" />

        {/* Enhanced Toolbar */}
        <TrackingToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCredentials={selectedCredentialId}
          onCredentialsChange={setSelectedCredentialId}
          onRefresh={() => syncOrdersFromAPI(selectedCredentialId, false)}
          onFullSync={() => syncOrdersFromAPI(selectedCredentialId, true)}
          onClearOrders={handleClearOrders}
          loading={loading}
          syncing={syncing}
          totalOrders={orders.length}
          filteredOrders={filteredAndSortedOrders.length}
          delayedCount={delayedCount}
          credentials={credentials}
        />

        {/* Tabs for Orders and Delayed Items */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Orders ({filteredAndSortedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="delayed" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Delayed Items ({slowItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mr-3" />
                <span className="text-muted-foreground">Loading orders...</span>
              </div>
            ) : filteredAndSortedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  No orders match your current search criteria
                </p>
              </div>
            ) : (
              <>
                {/* Enhanced Order Cards */}
                {paginatedOrders.map((order) => (
                  <EnhancedOrderCard
                    key={order.id}
                    order={order}
                    isExpanded={expandedOrders.has(order.number)}
                    onToggleExpand={() => toggleOrderExpansion(order.number)}
                    onTrack={() => order.tracking_url && handleTrackingClick(order.tracking_url)}
                    onGetLabels={() => handleGetLabels(order.number)}
                    isLoadingLabels={loadingLabels.has(order.number)}
                    labels={orderLabels.get(order.number)}
                  />
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="delayed" className="mt-6">
            <DelayedItemsTab
              onTrackingClick={handleTrackingClick}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
