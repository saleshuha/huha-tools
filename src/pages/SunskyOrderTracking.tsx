import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { useSunskyCredentials } from '@/hooks/useSunskyCredentials';
import { useCountry } from '@/contexts/CountryContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Package, RefreshCw
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

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-20 flex flex-col border-l-4 border-l-blue-500">
                  <CardContent className="p-4 flex-1 flex items-center">
                    <div className="flex items-center gap-2 w-full">
                      <Package className="h-5 w-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{orderStats.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-orange-500/5 to-background h-20 flex flex-col border-l-4 border-l-orange-500">
                  <CardContent className="p-4 flex-1 flex items-center">
                    <div className="flex items-center gap-2 w-full">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Unpaid</p>
                        <p className="text-2xl font-bold">{orderStats.unpaid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-green-500/5 to-background h-20 flex flex-col border-l-4 border-l-green-500">
                  <CardContent className="p-4 flex-1 flex items-center">
                    <div className="flex items-center gap-2 w-full">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Paid</p>
                        <p className="text-2xl font-bold">{orderStats.paid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-purple-500/5 to-background h-20 flex flex-col border-l-4 border-l-purple-500">
                  <CardContent className="p-4 flex-1 flex items-center">
                    <div className="flex items-center gap-2 w-full">
                      <Truck className="h-5 w-5 text-purple-500" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Shipped</p>
                        <p className="text-2xl font-bold">{orderStats.shipped}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-indigo-500/5 to-background h-20 flex flex-col border-l-4 border-l-indigo-500">
                  <CardContent className="p-4 flex-1 flex items-center">
                    <div className="flex items-center gap-2 w-full">
                      <ExternalLink className="h-5 w-5 text-indigo-500" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(orderStats.totalValue, 'USD')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Orders List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Sunsky Orders ({filteredAndSortedOrders.length})
                    {delayedCount > 0 && (
                      <Badge variant="destructive">{delayedCount} with delayed items</Badge>
                    )}
                    {!selectedCredentialId && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Select credentials to sync
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                      Loading orders...
                    </div>
                  ) : filteredAndSortedOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No orders found matching your criteria</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paginatedOrders.map((order) => {
                        const isExpanded = expandedOrders.has(order.number);
                        const labels = orderLabels.get(order.number) || [];
                        const isLoadingLabels = loadingLabels.has(order.number);
                        const orderProgress = calculateOrderProgress(order.status || 'pending');
                        const itemsProgress = calculateItemsProgress(order.items || []);
                        
                        return (
                          <div
                            key={order.id}
                            className="border border-border rounded-lg hover:shadow-medium transition-all duration-200 bg-card"
                          >
                            {/* Order Header - Clickable to view details */}
                            <div 
                              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => navigate(`/sunsky-order-details/${order.number}`)}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-primary" />
                                    <span className="font-mono text-sm font-semibold">
                                      #{order.number}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${orderProgress.statusColor} text-white`}>
                                      {orderProgress.statusLabel}
                                    </Badge>
                                    {order.po_numbers && order.po_numbers.length > 0 && (
                                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                                        PO Linked
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Package className="h-4 w-4" />
                                    {order.items?.length || 0} items
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {formatDate(order.gmt_created)}
                                  </div>
                                  {order.total && (
                                    <div className="font-semibold">
                                      {formatCurrency(order.total, order.currency)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-muted-foreground">Order Progress</span>
                                  <span className="text-xs text-muted-foreground">{orderProgress.percentage}%</span>
                                </div>
                                <Progress value={orderProgress.percentage} className="h-2" />
                              </div>

                              {/* Items Progress Bar */}
                              {order.items && order.items.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">
                                      Items Progress ({itemsProgress.completedItems}/{itemsProgress.totalItems})
                                    </span>
                                    <span className="text-xs text-muted-foreground">{itemsProgress.percentage}%</span>
                                  </div>
                                  <Progress value={itemsProgress.percentage} className="h-1" />
                                </div>
                              )}
                              
                              {/* Order summary row */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="text-muted-foreground">
                                  {order.shipping_company && (
                                    <span>via {order.shipping_company}</span>
                                  )}
                                  {order.tracking_number && (
                                    <span className="ml-2 font-mono">
                                      • Tracking: {order.tracking_number}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-primary hover:text-primary-dark"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Details
                                  </Button>
                                  
                                  {order.tracking_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTrackingClick(order.tracking_url!);
                                      }}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Track
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Preview Section - Only for expanded orders */}
                            <Collapsible
                              open={isExpanded}
                              onOpenChange={() => toggleOrderExpansion(order.number)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full border-t border-border rounded-none rounded-b-lg h-8"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      Hide Preview
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      Quick Preview
                                    </>
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent>
                                <div className="border-t border-border p-4 bg-muted/30">
                                  <div className="space-y-4">
                                    {/* PO Numbers */}
                                    {order.po_numbers && order.po_numbers.length > 0 && (
                                      <div>
                                        <h4 className="font-medium mb-2 text-sm">Linked PO Numbers</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {order.po_numbers.map((poNumber, index) => (
                                            <Badge key={index} variant="outline" className="font-mono text-xs">
                                              {poNumber}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Top 3 Items Preview */}
                                    {order.items && order.items.length > 0 && (
                                      <div>
                                        <h4 className="font-medium mb-2 text-sm">
                                          Items Preview ({Math.min(3, order.items.length)} of {order.items.length})
                                        </h4>
                                        <div className="space-y-2">
                                          {order.items.slice(0, 3).map((item, itemIndex) => (
                                            <div 
                                              key={item.id || itemIndex}
                                              className="bg-card p-2 rounded border border-border text-xs"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium truncate">
                                                    {item.title || item.sku_code || 'Unknown Item'}
                                                  </p>
                                                  {item.sku_code && (
                                                    <p className="text-muted-foreground font-mono">
                                                      SKU: {item.sku_code}
                                                    </p>
                                                  )}
                                                </div>
                                                <div className="text-right ml-2">
                                                  {getStatusBadge(item.item_status || 'pending', isItemDelayed(item))}
                                                  <div className="text-muted-foreground mt-1">
                                                    Qty: {item.quantity || 1}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                          {order.items.length > 3 && (
                                            <div className="text-center text-xs text-muted-foreground py-2">
                                              +{order.items.length - 3} more items. Click "View Details" to see all.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Action buttons */}
                                    <div className="flex gap-2 pt-2 border-t border-border">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleGetLabels(order.number);
                                        }}
                                        disabled={isLoadingLabels}
                                      >
                                        {isLoadingLabels ? (
                                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Package className="h-3 w-3 mr-1" />
                                        )}
                                        Get Labels
                                      </Button>
                                      
                                      {labels.length > 0 && (
                                        <Badge variant="outline" className="text-green-600 border-green-300">
                                          {labels.length} labels available
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {filteredAndSortedOrders.length > itemsPerPage && (
                    <div className="flex items-center justify-between pt-6 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length} orders
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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
    </div>
  );
}
