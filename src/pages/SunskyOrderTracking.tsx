import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { useCountry } from '@/contexts/CountryContext';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ExternalLink, Search, RefreshCw, ChevronDown, ChevronUp,
  Package, Clock, Truck, CheckCircle, AlertTriangle, AlertCircle, Eye,
  Filter, Calendar, TrendingUp, Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SunskyCredentialsSelector } from '@/components/SunskyCredentialsSelector';
import { SegmentedProgress } from '@/components/sunsky/SegmentedProgress';
import { ItemStatusBadge } from '@/components/sunsky/ItemStatusBadge';
import { DelayedItemsTab } from '@/components/sunsky/DelayedItemsTab';
import { calculateOrderProgress, calculateItemsProgress, getDaysInStatus, isItemDelayed } from '@/utils/sunsky-progress';

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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [slowItems, setSlowItems] = useState<SlowItem[]>([]);
  const [showOnlyPOLinked, setShowOnlyPOLinked] = useState(false);
  const [showInFlightOnly, setShowInFlightOnly] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState<Set<string>>(new Set());
  const [orderLabels, setOrderLabels] = useState<Map<string, any[]>>(new Map());
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'status' | 'value'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { selectedCountry } = useCountry();
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
      
      const readableStatus = getReadableStatus(order.status || 'pending');
      const matchesStatus = selectedStatus === 'all' || 
                           readableStatus === selectedStatus ||
                           order.status === selectedStatus;

      // In-flight filter (exclude delivered orders)
      const isInFlight = readableStatus !== 'delivered';
      const matchesInFlight = !showInFlightOnly || isInFlight;

      return matchesSearch && matchesStatus && matchesInFlight;
    });

    // Sort orders
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'updated':
          aValue = new Date(a.updated_at || a.created_at).getTime();
          bValue = new Date(b.updated_at || b.created_at).getTime();
          break;
        case 'created':
          aValue = new Date(a.gmt_created || a.created_at).getTime();
          bValue = new Date(b.gmt_created || b.created_at).getTime();
          break;
        case 'status':
          const aProgress = calculateOrderProgress(a.status);
          const bProgress = calculateOrderProgress(b.status);
          aValue = aProgress.currentStep;
          bValue = bProgress.currentStep;
          break;
        case 'value':
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [orders, searchTerm, selectedStatus, showInFlightOnly, sortBy, sortDirection]);

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
    // Always fetch all available orders from Sunsky (not filtered by PO linkage) 
    fetchStoredOrders(showOnlyPOLinked);
    loadSlowItems();
  }, [showOnlyPOLinked]);

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
    pending: orders.filter(o => getReadableStatus(o.status || 'pending') === 'ordered' || o.status === 'pending').length,
    unpaid: orders.filter(o => getReadableStatus(o.status || 'pending') === 'unpaid').length,
    paid: orders.filter(o => getReadableStatus(o.status || 'pending') === 'paid').length,
    shipped: orders.filter(o => getReadableStatus(o.status || 'pending') === 'shipped').length,
    delivered: orders.filter(o => getReadableStatus(o.status || 'pending') === 'delivered').length,
    totalValue: orders.reduce((sum, order) => sum + (order.total || 0), 0)
  };

  const delayedCount = filteredAndSortedOrders.filter(order => 
    order.items?.some(item => isItemDelayed(item))
  ).length;

  return (
    <div className="min-h-screen bg-gradient-surface">
      <HuhaHeader01
        icon={<Package className="w-5 h-5 text-primary-foreground" />}
        title="Sunsky Order Tracking (Global)"
        subtitle={`Track ALL Sunsky orders and monitor item delivery status for ${selectedCountry}`}
      />
      <div className="glass-container my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => syncOrdersFromAPI(selectedCredentialId)}
                disabled={syncing}
                variant="default"
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync All Orders
              </Button>
              <SunskyCredentialsSelector
                selectedCredentialId={selectedCredentialId}
                onCredentialSelect={setSelectedCredentialId}
              />
            </div>
          </div>

          {/* Progress bar for syncing */}
          {syncing && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Fetching ALL orders from Sunsky API...
                </span>
                <span className="text-sm text-blue-600 font-mono">
                  {progressCurrent}/{progressTotal} ({progressPercent}%)
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-blue-600 mt-1">
                This will fetch all orders from your Sunsky account, not just app-related orders
              </p>
            </div>
          )}

          {/* Tabs for Orders and Delayed Items */}
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Orders ({filteredAndSortedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="delayed" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Delayed Items ({slowItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-6">
              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders by number, PO numbers, or status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-40"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="ordered">Ordered</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="error">Error</option>
                    <option value="api_error">API Error</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">View:</label>
                    <select
                      value={showOnlyPOLinked ? 'po-linked' : 'all-orders'}
                      onChange={(e) => setShowOnlyPOLinked(e.target.value === 'po-linked')}
                      className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="all-orders">All Sunsky Orders ({orders.length})</option>
                      <option value="po-linked">PO-Linked Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{orderStats.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Unpaid</p>
                        <p className="text-2xl font-bold">{orderStats.unpaid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Paid</p>
                        <p className="text-2xl font-bold">{orderStats.paid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Shipped</p>
                        <p className="text-2xl font-bold">{orderStats.shipped}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-indigo-500" />
                      <div>
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
