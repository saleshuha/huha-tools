import { useState, useEffect } from 'react';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { useCountry } from '@/contexts/CountryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  ExternalLink, Search, RefreshCw, ChevronDown, ChevronUp,
  Package, Clock, Truck, CheckCircle, AlertTriangle, AlertCircle 
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SunskyCredentialsSelector } from '@/components/SunskyCredentialsSelector';

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
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [slowItems, setSlowItems] = useState<SlowItem[]>([]);
  const [showOnlyPOLinked, setShowOnlyPOLinked] = useState(false);
  const [fetchAllOrders, setFetchAllOrders] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState<Set<string>>(new Set());
  const [orderLabels, setOrderLabels] = useState<Map<string, any[]>>(new Map());
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);

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

  // Filter orders based on search and status with proper status mapping
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some(item => 
        item.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const readableStatus = getReadableStatus(order.status);
    const matchesStatus = selectedStatus === 'all' || 
                         readableStatus === selectedStatus ||
                         order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Load slow items
  const loadSlowItems = async () => {
    const items = await getSlowItems(3);
    setSlowItems(items);
  };

  useEffect(() => {
    // Always fetch all available orders from Sunsky (not filtered by PO linkage) 
    fetchStoredOrders(showOnlyPOLinked);
    loadSlowItems();
  }, [showOnlyPOLinked]);

  // Auto-sync orders on credential change
  useEffect(() => {
    if (selectedCredentialId && !syncing) {
      // Auto-sync when credential is selected
      syncOrdersFromAPI(selectedCredentialId);
    }
  }, [selectedCredentialId]);

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
    pending: orders.filter(o => getReadableStatus(o.status) === 'ordered' || o.status === 'pending').length,
    unpaid: orders.filter(o => getReadableStatus(o.status) === 'unpaid').length,
    paid: orders.filter(o => getReadableStatus(o.status) === 'paid').length,
    shipped: orders.filter(o => getReadableStatus(o.status) === 'shipped').length,
    delivered: orders.filter(o => getReadableStatus(o.status) === 'delivered').length,
    totalValue: orders.reduce((sum, order) => sum + (order.total || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                📦 Sunsky Order Tracking (Global)
              </h1>
              <p className="text-muted-foreground text-lg">
                Track ALL Sunsky orders and monitor item delivery status for {selectedCountry}
              </p>
            </div>
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

          {/* Delayed items alert */}
          {slowItems.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Delayed Items ({slowItems.length})
              </h3>
              <div className="space-y-2">
                {slowItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="text-sm text-orange-700 flex justify-between">
                    <span>{item.title || item.sku_code} (Order: {item.order_number})</span>
                    <span>{item.days_in_status} days in {item.item_status || 'current'} status</span>
                  </div>
                ))}
                {slowItems.length > 5 && (
                  <div className="text-xs text-orange-600">
                    +{slowItems.length - 5} more delayed items
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, tracking, SKU, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
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

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              All Sunsky Orders ({filteredOrders.length})
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
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No Sunsky orders found</p>
                {!selectedCredentialId ? (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200 max-w-md mx-auto">
                    <p className="text-sm text-orange-700 font-medium">Select Sunsky credentials above to sync orders</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm">No orders synced yet from Sunsky</p>
                      <Button 
                        onClick={() => syncOrdersFromAPI(selectedCredentialId)}
                        disabled={syncing}
                        className="mt-2 bg-gradient-primary hover:bg-gradient-primary/90"
                      >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Fetch All Orders from Sunsky
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-primary">
                    <Collapsible 
                      open={expandedOrders.has(order.number)}
                      onOpenChange={() => toggleOrderExpansion(order.number)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-bold text-lg">Order #{order.number}</div>
                                <div className="text-sm text-muted-foreground">
                                  Site: {order.site_number || 'N/A'} • Created: {formatDate(order.gmt_created)}
                                </div>
                              </div>
                              {getStatusBadge(order.status || 'pending')}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold">
                                  {order.total ? formatCurrency(order.total, order.currency) : 'N/A'}
                                </div>
                                {order.tracking_number && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {order.tracking_number}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGetLabels(order.number);
                                  }}
                                  disabled={loadingLabels.has(order.number)}
                                >
                                  {loadingLabels.has(order.number) ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Package className="h-3 w-3 mr-1" />
                                  )}
                                  Labels
                                </Button>
                                {expandedOrders.has(order.number) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                       <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="border-t pt-4">
                            {/* Labels section */}
                            {orderLabels.has(order.number) && orderLabels.get(order.number)!.length > 0 && (
                              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="font-medium text-blue-800 mb-2">Order Labels</h4>
                                <div className="space-y-2">
                                  {orderLabels.get(order.number)!.map((label, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                      <span className="font-mono text-blue-700">{label.barcode}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(label.url, '_blank')}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View Label
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Items ({order.items?.length || 0})
                            </h4>
                            
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-3">
                                {order.items.map((item, index) => {
                                  const delayed = isItemDelayed(item);
                                  return (
                                    <div key={index} className={`p-3 rounded border ${delayed ? 'border-orange-200 bg-orange-50' : 'border-border'}`}>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="font-medium">{item.title || 'Untitled Item'}</div>
                                          <div className="text-sm text-muted-foreground space-y-1">
                                            <div>SKU: {item.sku_code || 'N/A'}</div>
                                            {item.model_number && <div>Model: {item.model_number}</div>}
                                            <div>Quantity: {item.quantity || 'N/A'}</div>
                                            {item.unit_price && (
                                              <div>Price: {formatCurrency(item.unit_price, item.currency || 'USD')}</div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="ml-4 text-right space-y-2">
                                          {item.item_status && getStatusBadge(item.item_status, delayed)}
                                          
                                          {item.expected_ship_date && (
                                            <div className="text-xs text-muted-foreground">
                                              Expected: {formatDate(item.expected_ship_date)}
                                            </div>
                                          )}
                                          
                                          {delayed && (
                                            <div className="text-xs text-orange-600 font-medium">
                                              {Math.floor((Date.now() - new Date(item.status_last_updated_at || item.created_at).getTime()) / (1000 * 60 * 60 * 24))} days in status
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <div className="space-y-3">
                                  <Package className="h-8 w-8 mx-auto opacity-50" />
                                  <div>
                                    <p className="text-sm font-medium">No items loaded for this order</p>
                                     <p className="text-xs">
                                       {order.status === 'unpaid' 
                                         ? 'Order is not yet paid on Sunsky - item details unavailable'
                                         : order.status === 'error'
                                         ? 'Order has error status on Sunsky - items may not be available'
                                         : order.status === 'api_error'
                                         ? 'API credential or access issue - please check Sunsky credentials'
                                         : 'Items may not have been fetched yet'}
                                     </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await getOrderDetails(order.number, false, order.sunsky_credentials_id);
                                    }}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Resync Details
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {/* Show PO Numbers if available */}
                            {order.po_numbers && order.po_numbers.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Related PO Numbers:</div>
                                <div className="flex flex-wrap gap-1">
                                  {order.po_numbers.map((poNumber, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {poNumber}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}