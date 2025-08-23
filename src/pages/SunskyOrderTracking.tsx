import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Package, Search, RefreshCw, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PlacedOrder {
  id: string;
  po_number: string;
  sku_code: string;
  quantity: number;
  status: string;
  order_date: string;
  expected_delivery?: string;
  supplier_order_number?: string;
  tracking_number?: string;
  tracking_url?: string;
  title?: string;
  model_number?: string;
  asin?: string;
  unit_cost?: number;
  total_cost?: number;
  currency?: string;
  ship_to_location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  ordered: 'bg-blue-100 text-blue-800', 
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: Clock,
  ordered: Package,
  shipped: Truck,
  delivered: CheckCircle,
  closed: CheckCircle,
  cancelled: AlertCircle
};

export default function SunskyOrderTrackingPage() {
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PlacedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();

  const fetchPlacedOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('po_orders')
        .select('*')
        .in('status', ['pending', 'ordered', 'shipped', 'delivered', 'closed'])
        .eq('country', selectedCountry)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error) {
      console.error('Error fetching placed orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load placed orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacedOrders();
  }, [selectedCountry]);

  useEffect(() => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.asin?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, selectedStatus, orders]);

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || AlertCircle;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleTrackingClick = (url: string) => {
    window.open(url, '_blank');
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    closed: orders.filter(o => o.status === 'closed').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalValue: orders.reduce((sum, order) => sum + (order.total_cost || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                📦 Sunsky Order Tracking
              </h1>
              <p className="text-muted-foreground text-lg">
                Track your placed Sunsky orders and manage deliveries for {selectedCountry}
              </p>
            </div>
            <Button onClick={fetchPlacedOrders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{orderStats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Closed</p>
                    <p className="text-2xl font-bold">{orderStats.closed}</p>
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
                placeholder="Search by PO number, SKU, tracking number, title..."
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
              <option value="ordered">Ordered</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList>
            <TabsTrigger value="orders">Order List</TabsTrigger>
            <TabsTrigger value="details">Detailed View</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Placed Orders ({filteredOrders.length})</CardTitle>
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
                    <p>No placed orders found</p>
                    <p className="text-sm">Orders will appear here once they are placed with Sunsky</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>SKU/Product</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.po_number}
                              {order.supplier_order_number && (
                                <div className="text-xs text-muted-foreground">
                                  Supplier: {order.supplier_order_number}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.sku_code}</div>
                                {order.title && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {order.title}
                                  </div>
                                )}
                                {order.model_number && (
                                  <div className="text-xs text-blue-600">
                                    Model: {order.model_number}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColors[order.status as keyof typeof statusColors]} flex items-center gap-1 w-fit`}>
                                {getStatusIcon(order.status)}
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>
                              {order.order_date ? formatDate(order.order_date) : 'N/A'}
                              {order.expected_delivery && (
                                <div className="text-xs text-muted-foreground">
                                  Expected: {formatDate(order.expected_delivery)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.tracking_number ? (
                                <div>
                                  <div className="font-mono text-xs">{order.tracking_number}</div>
                                  {order.tracking_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleTrackingClick(order.tracking_url!)}
                                      className="mt-1 h-6 text-xs"
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Track
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">No tracking yet</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.total_cost 
                                ? formatCurrency(order.total_cost, order.currency || 'USD')
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/po-tracker', { 
                                  state: { selectedPO: order.po_number } 
                                })}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <div className="grid gap-4">
              {filteredOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.po_number}</CardTitle>
                        <p className="text-muted-foreground">{order.sku_code}</p>
                      </div>
                      <Badge className={`${statusColors[order.status as keyof typeof statusColors]} flex items-center gap-1`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Product Details</h4>
                        <div className="space-y-1 text-sm">
                          {order.title && <p><strong>Title:</strong> {order.title}</p>}
                          {order.model_number && <p><strong>Model:</strong> {order.model_number}</p>}
                          {order.asin && <p><strong>ASIN:</strong> {order.asin}</p>}
                          <p><strong>Quantity:</strong> {order.quantity}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Order Information</h4>
                        <div className="space-y-1 text-sm">
                          {order.order_date && <p><strong>Order Date:</strong> {formatDate(order.order_date)}</p>}
                          {order.expected_delivery && <p><strong>Expected:</strong> {formatDate(order.expected_delivery)}</p>}
                          {order.supplier_order_number && <p><strong>Supplier Order:</strong> {order.supplier_order_number}</p>}
                          {order.ship_to_location && <p><strong>Ship To:</strong> {order.ship_to_location}</p>}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Tracking & Costs</h4>
                        <div className="space-y-1 text-sm">
                          {order.tracking_number && (
                            <div>
                              <p><strong>Tracking:</strong> {order.tracking_number}</p>
                              {order.tracking_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTrackingClick(order.tracking_url!)}
                                  className="mt-1"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Track Package
                                </Button>
                              )}
                            </div>
                          )}
                          {order.unit_cost && <p><strong>Unit Cost:</strong> {formatCurrency(order.unit_cost, order.currency)}</p>}
                          {order.total_cost && <p><strong>Total:</strong> {formatCurrency(order.total_cost, order.currency)}</p>}
                        </div>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}