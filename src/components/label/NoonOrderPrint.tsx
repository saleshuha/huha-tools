import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, Search, Printer, Calendar, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface NoonProcessingOrder {
  id: string;
  order_nr: string;
  order_status: string;
  quantity: number;
  purchase_item_nr: string;
  sku: string;
  title: string;
  order_country_code: string;
  file_name: string;
  file_upload_date?: string;
  order_received_at?: string;
  created_at: string;
}

export function NoonOrderPrint() {
  const [orders, setOrders] = useState<NoonProcessingOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<NoonProcessingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const { toast } = useToast();

  // Fetch noon processing orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('noon_processing_orders')
        .select('id, order_nr, order_status, quantity, purchase_item_nr, sku, title, order_country_code, file_name, file_upload_date, order_received_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching noon orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch noon orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search, status, country, and date range
  useEffect(() => {
    let filtered = [...orders];

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.purchase_item_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.sku && order.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.title && order.title.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    // Country filter
    if (countryFilter !== 'all') {
      filtered = filtered.filter(order => order.order_country_code === countryFilter);
    }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        if (dateRange.from && orderDate < new Date(dateRange.from)) return false;
        if (dateRange.to && orderDate > new Date(dateRange.to)) return false;
        return true;
      });
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, countryFilter, dateRange]);

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handlePrint = () => {
    const selectedOrdersList = filteredOrders.filter(order => selectedOrders.has(order.id));
    if (selectedOrdersList.length === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to print",
        variant: "destructive"
      });
      return;
    }

    // For now, show selected orders info
    toast({
      title: "Print Selected Orders",
      description: `Ready to print ${selectedOrdersList.length} noon order labels`,
    });
    
    // TODO: Integrate with label printing system
    console.log('Selected orders for printing:', selectedOrdersList);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      default:
        return 'outline';
    }
  };

  const uniqueStatuses = [...new Set(orders.map(order => order.order_status).filter(Boolean))];
  const uniqueCountries = [...new Set(orders.map(order => order.order_country_code).filter(Boolean))];

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card/95 to-card backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-card via-card/95 to-card backdrop-blur-sm">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                Noon Order Printing
              </div>
              <div className="text-sm text-muted-foreground">
                Print labels for processed Noon orders
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/60 bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-border/60 bg-background/50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60 shadow-xl z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Country Filter */}
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="border-border/60 bg-background/50">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60 shadow-xl z-50">
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.from || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                placeholder="From date"
                className="border-border/60 bg-background/50"
              />
              <Input
                type="date"
                value={dateRange.to || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                placeholder="To date"
                className="border-border/60 bg-background/50"
              />
            </div>
          </div>

          {/* Summary and Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {filteredOrders.length} orders found
                {selectedOrders.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    • {selectedOrders.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </Label>
              </div>
            </div>
            
            <Button
              onClick={handlePrint}
              disabled={selectedOrders.size === 0}
              className="bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Selected ({selectedOrders.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card/95 to-card backdrop-blur-sm">
        {filteredOrders.length === 0 ? (
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="p-6 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 w-24 h-24 mx-auto flex items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">No orders found</p>
                <p className="text-sm text-muted-foreground">
                  {orders.length === 0 
                    ? "No orders have been uploaded yet" 
                    : "Try adjusting your filters to see more results"}
                </p>
              </div>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20">
                    <th className="text-left p-4 text-sm font-semibold text-foreground w-12">
                      <Checkbox
                        checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Order Nr</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Item Nr</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">SKU</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Title</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Qty</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Country</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${index % 2 === 0 ? 'bg-background/30' : 'bg-muted/10'}`}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-4 text-sm">
                        <span className="font-mono font-medium text-foreground">{order.order_nr}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="font-mono text-muted-foreground">{order.purchase_item_nr}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="font-mono text-foreground">{order.sku || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="max-w-[200px] truncate block text-foreground" title={order.title}>
                          {order.title || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="font-medium">{order.quantity}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <Badge variant={getStatusBadgeVariant(order.order_status)} className="shadow-sm">
                          {order.order_status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="uppercase font-medium">{order.order_country_code}</span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="text-muted-foreground">
                          {order.order_received_at 
                            ? format(new Date(order.order_received_at), 'MMM dd, yyyy')
                            : format(new Date(order.created_at), 'MMM dd, yyyy')
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}