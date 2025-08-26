import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, FileUp, Search, Filter, Package, TrendingUp, ShoppingCart, Truck, DollarSign, X, Plus, Edit2, ExternalLink, Loader2, BarChart3, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POFileUpload } from '@/components/po/POFileUpload';
import { POProfitAnalytics } from '@/components/po/POProfitAnalytics';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export interface POOrder {
  id: string;
  user_id: string;
  po_number: string;
  ship_to_location?: string;
  asin?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  external_id?: string;
  external_id_type?: string;
  sku_code?: string; // Keep for backward compatibility
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'closed' | 'partial-fulfilled';
  order_date?: string;
  expected_delivery?: string;
  notes?: string;
  file_name: string;
  country?: string;
  currency?: string;
  unit_cost?: number;
  total_cost?: number;
  sku_user_id?: string;
  supplier_order_number?: string;
  tracking_number?: string;
  tracking_url?: string;
  created_at: string;
  updated_at: string;
  sunsky_sku?: any;
}

interface POGroup {
  poNumber: string;
  orders: POOrder[];
}

export const POTracker = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<POOrder['status'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const { poOrders, isLoading, fetchPOOrders, processPOFiles } = usePOOrders();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
  const { toast } = useToast();
  const navigate = useNavigate();

  // New query to fetch comprehensive PO metrics from database
  const { data: comprehensiveMetrics, isLoading: isLoadingComprehensiveMetrics, refetch: refetchComprehensiveMetrics } = useQuery({
    queryKey: ['po-comprehensive-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Fetching comprehensive PO metrics for user:', user.id);

      const { data, error } = await supabase.rpc('get_po_comprehensive_metrics', {
        user_id_param: user.id
      });

      if (error) {
        console.error('❌ Error fetching comprehensive metrics:', error);
        throw error;
      }

      console.log('📊 Comprehensive metrics result:', data);
      return data?.[0] || null;
    },
    enabled: !!profile?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Keep the existing PO group metrics query for the grouped view
  const { data: poGroupMetrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['po-group-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_po_group_metrics', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching PO group metrics:', error);
        throw error;
      }

      return data as Array<{
        po_number: string;
        distinct_skus: number;
        asn_quantity: number;
      }>;
    },
    enabled: !!profile?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (profile?.id && selectedCountry) {
      fetchPOOrders();
    }
  }, [profile?.id, selectedCountry, fetchPOOrders]);

  // Refetch metrics when PO orders change
  useEffect(() => {
    if (!isLoading && refetchMetrics && refetchComprehensiveMetrics) {
      refetchMetrics();
      refetchComprehensiveMetrics();
    }
  }, [poOrders, isLoading, refetchMetrics, refetchComprehensiveMetrics]);

  const filteredOrders = useMemo(() => {
    let filtered = [...poOrders];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.po_number.toLowerCase().includes(lowerCaseQuery) ||
        order.asin?.toLowerCase().includes(lowerCaseQuery) ||
        order.model_number?.toLowerCase().includes(lowerCaseQuery) ||
        order.title?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [poOrders, searchQuery, statusFilter]);

  const groupedPOOrders = useMemo(() => {
    const groups: { [key: string]: POOrder[] } = {};
    filteredOrders.forEach(order => {
      if (!groups[order.po_number]) {
        groups[order.po_number] = [];
      }
      groups[order.po_number].push(order);
    });

    const poGroups: POGroup[] = Object.entries(groups).map(([poNumber, orders]) => ({
      poNumber,
      orders
    }));

    return poGroups;
  }, [filteredOrders]);

  const filteredPOGroups = useMemo(() => {
    return groupedPOOrders.filter(({ poNumber, orders }) => {
      const lowerCaseQuery = searchQuery.toLowerCase();
      return poNumber.toLowerCase().includes(lowerCaseQuery) ||
        orders.some(order =>
          order.asin?.toLowerCase().includes(lowerCaseQuery) ||
          order.model_number?.toLowerCase().includes(lowerCaseQuery) ||
          order.title?.toLowerCase().includes(lowerCaseQuery)
        );
    });
  }, [groupedPOOrders, searchQuery]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPOGroups = useMemo(() => {
    return filteredPOGroups.slice(startIndex, endIndex);
  }, [filteredPOGroups, startIndex, endIndex]);

  // For detailed view - show individual line items
  const paginatedDetailedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Purchase Order Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your purchase orders across all suppliers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchPOOrders()}>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" style={{ animationPlayState: isLoading ? 'running' : 'paused' }} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Uploads
          </TabsTrigger>
          <TabsTrigger value="profit" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Profit Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Package className="h-5 w-5" />
                  Total PO Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comprehensiveMetrics?.total_line_items || poOrders.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {comprehensiveMetrics?.total_quantity || poOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">All line items across POs</p>
                {isLoadingComprehensiveMetrics && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading metrics...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Total Matched Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comprehensiveMetrics?.matched_line_items || poOrders.filter(order => order.sunsky_sku !== null).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {comprehensiveMetrics?.matched_quantity || poOrders.filter(order => order.sunsky_sku !== null).reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">SKUs matched with supplier</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Truck className="h-5 w-5" />
                  Total Placed Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comprehensiveMetrics?.placed_line_items || poOrders.filter(order => ['ordered', 'shipped', 'delivered'].includes(order.status)).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {comprehensiveMetrics?.placed_quantity || poOrders.filter(order => ['ordered', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">Orders placed with supplier</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Clock className="h-5 w-5" />
                  Total Pending Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comprehensiveMetrics?.pending_line_items || poOrders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Qty: {comprehensiveMetrics?.pending_quantity || poOrders.filter(order => order.status === 'pending' && order.sunsky_sku !== null).reduce((sum, order) => sum + (order.quantity || 0), 0)}
                </div>
                <p className="text-muted-foreground mt-1">Matched items awaiting order placement</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Orders Summary
                {isLoadingMetrics && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Input
                    type="text"
                    placeholder="Search PO number, ASIN, model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grouped')}
                        className="h-8"
                      >
                        Grouped
                      </Button>
                      <Button
                        variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('detailed')}
                        className="h-8"
                      >
                        Line Items
                      </Button>
                    </div>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as POOrder['status'] | 'all')}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Statuses</SelectItem>
                         <SelectItem value="pending">Pending</SelectItem>
                         <SelectItem value="ordered">Ordered</SelectItem>
                         <SelectItem value="shipped">Shipped</SelectItem>
                         <SelectItem value="delivered">Delivered</SelectItem>
                         <SelectItem value="cancelled">Cancelled</SelectItem>
                         <SelectItem value="closed">Closed</SelectItem>
                         <SelectItem value="partial-fulfilled">Partial Fulfilled</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border">
                  {viewMode === 'grouped' ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>PO Items</TableHead>
                          <TableHead>ASN Quantity</TableHead>
                          <TableHead>Matched %</TableHead>
                          <TableHead>Status Breakdown</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPOGroups.map(({ poNumber, orders }) => {
                          const firstOrder = orders[0];
                          
                          // Get metrics from database function
                          const dbMetrics = poGroupMetrics?.find(m => m.po_number === poNumber);
                          const totalLineItems = dbMetrics?.distinct_skus || 0;
                          const asnQuantity = dbMetrics?.asn_quantity || 0;
                          
                          // Calculate matched percentage for display
                          const activeOrdersInPO = orders.filter((order: any) => 
                            order.status === 'pending' || order.status === 'ordered' || order.status === 'shipped'
                          );
                          const matchedCount = activeOrdersInPO.filter((order: any) => order.sunsky_sku !== null).length;
                          const matchedPercentage = activeOrdersInPO.length > 0 ? ((matchedCount / activeOrdersInPO.length) * 100).toFixed(0) : '0';
                          
                          const statusCounts = orders.reduce((counts: any, order: any) => {
                            counts[order.status] = (counts[order.status] || 0) + 1;
                            return counts;
                          }, {});

                          return (
                            <TableRow key={poNumber}>
                              <TableCell className="font-medium">
                                <Button 
                                  variant="link" 
                                  className="p-0 h-auto font-medium text-left justify-start"
                                  onClick={() => navigate(`/po-details/${poNumber}`)}
                                >
                                  {poNumber}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{totalLineItems}</span>
                                  <span className="text-xs text-muted-foreground">distinct SKU lines</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{asnQuantity}</span>
                                  <span className="text-xs text-muted-foreground">active units</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={parseInt(matchedPercentage) >= 80 ? "default" : parseInt(matchedPercentage) >= 50 ? "secondary" : "destructive"}>
                                    {matchedPercentage}%
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {matchedCount}/{activeOrdersInPO.length} matched
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(statusCounts).map(([status, count]) => (
                                    <Badge key={status} variant="outline" className="text-xs">
                                      {status}: {count as number}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/po-details/${poNumber}`)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>ASIN</TableHead>
                          <TableHead>Model/SKU</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Matched</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDetailedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-medium text-left justify-start"
                                onClick={() => navigate(`/po-details/${order.po_number}`)}
                              >
                                {order.po_number}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{order.asin || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.model_number && (
                                  <div className="text-sm font-medium">{order.model_number}</div>
                                )}
                                {order.sku_code && order.sku_code !== order.model_number && (
                                  <div className="text-xs text-muted-foreground">{order.sku_code}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[200px] truncate text-sm" title={order.title}>
                                {order.title || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono">
                                {order.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  order.status === 'delivered' ? 'default' :
                                  order.status === 'shipped' ? 'secondary' :
                                  order.status === 'ordered' ? 'outline' :
                                  order.status === 'pending' ? 'destructive' :
                                  'outline'
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.sunsky_sku ? 'default' : 'destructive'}>
                                {order.sunsky_sku ? 'Matched' : 'No Match'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.unit_cost && (
                                  <div className="text-sm font-medium">
                                    {order.currency} {order.unit_cost}
                                  </div>
                                )}
                                {order.total_cost && (
                                  <div className="text-xs text-muted-foreground">
                                    Total: {order.currency} {order.total_cost}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/po-details/${order.po_number}`)}
                                >
                                  Details
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {Math.ceil((viewMode === 'grouped' ? filteredPOGroups.length : filteredOrders.length) / itemsPerPage)}
                    {' '}(showing {viewMode === 'grouped' ? 'PO groups' : 'line items'})
                  </span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil((viewMode === 'grouped' ? filteredPOGroups.length : filteredOrders.length) / itemsPerPage)))}
                    disabled={currentPage === Math.ceil((viewMode === 'grouped' ? filteredPOGroups.length : filteredOrders.length) / itemsPerPage)}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Purchase Orders</CardTitle>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload a CSV file containing purchase orders to track.
                </p>
              </CardContent>
            </CardHeader>
            <CardContent>
              <POFileUpload onFilesUpload={(data) => {
                // Handle file upload in the uploads section
                if (!profile) {
                  toast({
                    title: "Error",
                    description: "User profile not loaded",
                    variant: "destructive"
                  });
                  return;
                }

                if (!selectedCountry) {
                  toast({
                    title: "Error", 
                    description: "Please select a country",
                    variant: "destructive"
                  });
                  return;
                }

                const mappedData = data.map((item: any) => ({
                  po_number: item.po_number,
                  ship_to_location: item.ship_to_location,
                  asin: item.asin,
                  model_number: item.model_number,
                  title: item.title,
                  quantity: item.quantity,
                  external_id: item.external_id,
                  external_id_type: item.external_id_type,
                  file_name: item.file_name,
                  country: selectedCountry
                }));

                processPOFiles(mappedData, []).then(() => {
                  fetchPOOrders();
                });
              }} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-6">
          <POProfitAnalytics poOrders={poOrders} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
