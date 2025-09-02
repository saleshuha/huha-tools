import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Truck, 
  Package, 
  Eye, 
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Hash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { SunskyCredentialsSelector } from './SunskyCredentialsSelector';
import { format } from 'date-fns';

export function SunskyOrderTracking() {
  const { toast } = useToast();
  const { 
    orders: noonOrders, 
    loading: noonLoading, 
    syncOrderStatus,
    refreshOrders
  } = useNoonOrders();
  const { 
    orders: sunskyOrders, 
    loading: sunskyLoading, 
    syncOrdersFromAPI,
    getOrderDetails 
  } = useSunskyOrders();

  // States
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Show all noon orders (both placed and pending)
  const allNoonOrders = noonOrders;
  const placedOrders = noonOrders.filter(order => order.sunsky_order_number);
  
  // Search functionality
  const filteredNoonOrders = allNoonOrders.filter(order =>
    order.order_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.sunsky_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.partner_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSunskyOrders = sunskyOrders.filter(order =>
    order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.site_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBulkSyncSunsky = async () => {
    if (!selectedCredentialId) {
      toast({
        title: "No API Credentials Selected",
        description: "Please select Sunsky API credentials",
        variant: "destructive"
      });
      return;
    }

    try {
      await syncOrdersFromAPI(selectedCredentialId);
      toast({
        title: "Bulk Sync Complete",
        description: "All Sunsky orders have been synced",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync Sunsky orders",
        variant: "destructive"
      });
    }
  };

  const handleSyncOrderStatus = async (orderId: string) => {
    try {
      await syncOrderStatus(orderId);
      toast({
        title: "Status Synced",
        description: "Order status has been synced with Sunsky",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync order status",
        variant: "destructive"
      });
    }
  };

  const handleViewOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setLoadingDetails(true);
    
    try {
      const details = await getOrderDetails(order.number || order.sunsky_order_number, false, selectedCredentialId);
      setOrderDetails(details);
    } catch (error) {
      toast({
        title: "Failed to Load Details",
        description: "Could not load order details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'secondary', icon: Clock, text: 'Pending' },
      'processing': { color: 'default', icon: Package, text: 'Processing' },
      'shipped': { color: 'default', icon: Truck, text: 'Shipped' },
      'delivered': { color: 'default', icon: CheckCircle, text: 'Delivered' },
      'cancelled': { color: 'destructive', icon: AlertCircle, text: 'Cancelled' }
    };

    const config = statusConfig[status?.toLowerCase() as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getOrderProgress = (status: string) => {
    const progressMap = {
      'pending': 25,
      'processing': 50,
      'shipped': 75,
      'delivered': 100,
      'cancelled': 0
    };
    return progressMap[status?.toLowerCase() as keyof typeof progressMap] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Truck className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Sunsky Order Tracking</h2>
        </div>
        <div className="flex items-center gap-4">
          <SunskyCredentialsSelector 
            selectedCredentialId={selectedCredentialId}
            onCredentialSelect={setSelectedCredentialId}
          />
          <Button 
            onClick={handleBulkSyncSunsky} 
            variant="outline" 
            size="sm"
            disabled={!selectedCredentialId}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All Orders
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, Sunsky order number, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{allNoonOrders.length}</div>
              <div className="text-sm text-muted-foreground">Total Noon Orders</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{placedOrders.length}</div>
              <div className="text-sm text-muted-foreground">Placed with Sunsky</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {placedOrders.filter(o => o.sunsky_tracking_number).length}
              </div>
              <div className="text-sm text-muted-foreground">With Tracking</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{sunskyOrders.length}</div>
              <div className="text-sm text-muted-foreground">Sunsky Orders</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Order Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Tracking</TabsTrigger>
          <TabsTrigger value="sunsky-orders">Sunsky Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Noon Orders Overview ({filteredNoonOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {noonLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading orders...
                </div>
              ) : filteredNoonOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No noon orders found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNoonOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="grid grid-cols-7 gap-4 flex-1 text-sm">
                        <div>
                          <div className="font-medium">{order.order_nr}</div>
                          <div className="text-muted-foreground text-xs">{order.partner_sku || order.sku}</div>
                        </div>
                        <div>
                          <div className="font-medium">Title</div>
                          <div className="text-muted-foreground text-xs">{order.title}</div>
                        </div>
                        <div>
                          <div className="font-medium">Sunsky Order</div>
                          <div className="text-muted-foreground">
                            {order.sunsky_order_number ? (
                              <span className="text-green-600">{order.sunsky_order_number}</span>
                            ) : (
                              <span className="text-yellow-600">Not Placed</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Quantity</div>
                          <div className="text-muted-foreground">{order.quantity}</div>
                        </div>
                        <div>
                          <div className="font-medium">Order Status</div>
                          <div>{getStatusBadge(order.order_status || 'pending')}</div>
                        </div>
                        <div>
                          <div className="font-medium">Tracking</div>
                          <div className="text-muted-foreground">
                            {order.sunsky_tracking_number ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Available
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-orange-500" />
                                {order.sunsky_order_number ? 'Pending' : 'No Order'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Progress</div>
                          <Progress value={getOrderProgress(order.order_status || 'pending')} className="w-full" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {order.sunsky_order_number ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewOrderDetails(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSyncOrderStatus(order.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Ready for Placement
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Tracking Tab */}
        <TabsContent value="detailed" className="space-y-4">
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Order Details: {selectedOrder.order_nr}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Back to List
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDetails ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading order details...
                  </div>
                ) : orderDetails ? (
                  <div className="space-y-6">
                    {/* Order Header */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Order Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Noon Order:</span>
                            <span className="font-medium">{selectedOrder.order_nr}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sunsky Order:</span>
                            <span className="font-medium">{selectedOrder.sunsky_order_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            {getStatusBadge(orderDetails.status || 'pending')}
                          </div>
                          <div className="flex justify-between">
                            <span>Total Amount:</span>
                            <span className="font-medium">
                              {orderDetails.currency} {orderDetails.total}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Shipping Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Shipping Company:</span>
                            <span className="font-medium">{orderDetails.shipping_company || 'TBD'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tracking Number:</span>
                            <span className="font-medium">
                              {orderDetails.tracking_number || 'Not available'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Created Date:</span>
                            <span className="font-medium">
                              {orderDetails.gmt_created ? 
                                format(new Date(orderDetails.gmt_created), 'PPp') : 
                                'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    {orderDetails.items && orderDetails.items.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-4">Order Items</h4>
                        <div className="space-y-3">
                          {orderDetails.items.map((item: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <div className="font-medium">{item.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    SKU: {item.sku_code}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">Qty: {item.quantity}</div>
                                  <div className="text-sm text-muted-foreground">
                                    ${item.unit_price}
                                  </div>
                                </div>
                                <div className="text-center">
                                  {getStatusBadge(item.item_status || 'pending')}
                                </div>
                                <div className="text-right">
                                  {item.expected_ship_date && (
                                    <div className="text-sm">
                                      <Calendar className="h-3 w-3 inline mr-1" />
                                      {format(new Date(item.expected_ship_date), 'PP')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Failed to load order details
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  Select an order from the Overview tab to view detailed tracking information
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sunsky Orders Tab */}
        <TabsContent value="sunsky-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Sunsky Orders ({filteredSunskyOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sunskyLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading Sunsky orders...
                </div>
              ) : filteredSunskyOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No Sunsky orders found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSunskyOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-medium">{order.number}</div>
                            <div className="text-sm text-muted-foreground">
                              Site: {order.site_number}
                            </div>
                          </div>
                          {getStatusBadge(order.status || 'pending')}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {order.currency} {order.total}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.gmt_created ? 
                              format(new Date(order.gmt_created), 'PP') : 
                              'No date'
                            }
                          </div>
                        </div>
                      </div>
                      
                      {order.tracking_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>Tracking: {order.tracking_number}</span>
                          {order.tracking_url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(order.tracking_url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {order.items && order.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-medium mb-2">
                            Items ({order.items.length})
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {order.items.slice(0, 4).map((item: any, index: number) => (
                              <div key={index} className="flex justify-between">
                                <span className="truncate">{item.title || item.sku_code}</span>
                                <span>Qty: {item.quantity}</span>
                              </div>
                            ))}
                            {order.items.length > 4 && (
                              <div className="col-span-2 text-muted-foreground text-center">
                                ... and {order.items.length - 4} more items
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}