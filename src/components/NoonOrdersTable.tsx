import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Search, 
  RefreshCw, 
  ShoppingCart, 
  Eye, 
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck
} from 'lucide-react';
import { useNoonOrders, type NoonOrder } from '@/hooks/useNoonOrders';
import { SunskyCredentialsSelector } from '@/components/SunskyCredentialsSelector';
import { formatDistanceToNow } from 'date-fns';

interface NoonStore {
  id: string;
  name: string;
  partner_id: string | null;
  country: string;
}

const getSunskyStatusText = (status?: number) => {
  switch (status) {
    case 1: return 'Unpaid';
    case 2: return 'Paid';
    case 3: return 'Shipped';
    case 4: return 'Cancelled';
    case 5: return 'Delivered';
    default: return 'Unknown';
  }
};

const getSunskyStatusIcon = (status?: number) => {
  switch (status) {
    case 1: return <Clock className="h-4 w-4" />;
    case 2: return <CheckCircle className="h-4 w-4" />;
    case 3: return <Truck className="h-4 w-4" />;
    case 4: return <AlertCircle className="h-4 w-4" />;
    case 5: return <CheckCircle className="h-4 w-4" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
};

const getSunskyStatusVariant = (status?: number) => {
  switch (status) {
    case 1: return 'secondary';
    case 2: return 'default';
    case 3: return 'default';
    case 4: return 'destructive';
    case 5: return 'default';
    default: return 'outline';
  }
};

export function NoonOrdersTable() {
  const { orders, loading, placeOrderWithSunsky, syncOrderStatus, refreshOrders } = useNoonOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const [stores, setStores] = useState<NoonStore[]>([]);

  // Load noon stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      try {
        const { data, error } = await supabase
          .from('noon_stores')
          .select('id, name, partner_id, country')
          .order('country', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setStores(data || []);
      } catch (error) {
        console.error('Error loading stores:', error);
      }
    };

    loadStores();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_nr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.partner_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      order.item_status === statusFilter ||
      (statusFilter === 'pending' && !order.sunsky_order_number) ||
      (statusFilter === 'placed' && order.sunsky_order_number);

    const matchesCountry = countryFilter === 'all' || order.order_country_code === countryFilter;

    const matchesStore = storeFilter === 'all' || 
      (storeFilter === 'no-store' && !(order as any).noon_store_id) ||
      (storeFilter !== 'no-store' && (order as any).noon_store_id === storeFilter);
    
    return matchesSearch && matchesStatus && matchesCountry && matchesStore;
  });

  // Get unique countries from orders
  const countries = Array.from(new Set(orders.map(order => order.order_country_code)));

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return 'No Store';
    const store = stores.find(s => s.id === storeId);
    return store ? `${store.name} (${store.country})` : 'Unknown Store';
  };

  const handlePlaceOrder = async (order: NoonOrder) => {
    if (!selectedCredentialId) {
      alert('Please select Sunsky credentials first');
      return;
    }

    setProcessingOrders(prev => new Set(prev).add(order.id));
    try {
      await placeOrderWithSunsky(order.id, selectedCredentialId);
    } finally {
      setProcessingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleSyncStatus = async (order: NoonOrder) => {
    setProcessingOrders(prev => new Set(prev).add(order.id));
    try {
      await syncOrderStatus(order.id);
    } finally {
      setProcessingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Noon Orders Tracking
        </CardTitle>
        <CardDescription>
          Track and manage your noon orders with Sunsky integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, SKUs, titles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="no-store">No Store</SelectItem>
              {stores
                .filter(store => countryFilter === 'all' || store.country === countryFilter)
                .map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} ({store.country})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={refreshOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Sunsky Credentials Selector */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Sunsky Integration</h4>
          <SunskyCredentialsSelector 
            selectedCredentialId={selectedCredentialId}
            onCredentialSelect={setSelectedCredentialId}
          />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold">
              {orders.filter(o => !o.sunsky_order_number).length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold">
              {orders.filter(o => o.sunsky_order_number).length}
            </div>
            <div className="text-sm text-muted-foreground">Placed</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="text-2xl font-bold">
              {orders.filter(o => o.sunsky_order_status === 5).length}
            </div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Partner SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sunsky Order</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">{order.order_nr}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {getStoreName((order as any).noon_store_id)}
                    </span>
                  </TableCell>
                  <TableCell>{order.partner_sku || 'N/A'}</TableCell>
                  <TableCell>
                    <div>
                      <div className="truncate max-w-32" title={order.title}>
                        {order.title || order.sku || 'N/A'}
                      </div>
                      {order.sku && (
                        <div className="text-xs text-muted-foreground">SKU: {order.sku}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.order_country_code}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {order.item_status || order.order_status || 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.sunsky_order_number ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {getSunskyStatusIcon(order.sunsky_order_status)}
                          <Badge variant={getSunskyStatusVariant(order.sunsky_order_status)}>
                            {getSunskyStatusText(order.sunsky_order_status)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {order.sunsky_order_number}
                        </div>
                        {order.sunsky_tracking_number && (
                          <div className="text-xs text-muted-foreground">
                            Track: {order.sunsky_tracking_number}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">Not Placed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.sunsky_last_sync ? (
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.sunsky_last_sync), { addSuffix: true })}
                      </div>
                    ) : (
                      'Never'
                    )}
                    {order.sunsky_error_message && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {order.sunsky_error_message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!order.sunsky_order_number ? (
                        <Button
                          size="sm"
                          onClick={() => handlePlaceOrder(order)}
                          disabled={!order.partner_sku || !selectedCredentialId || processingOrders.has(order.id)}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Place
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSyncStatus(order)}
                          disabled={processingOrders.has(order.id)}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${processingOrders.has(order.id) ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {orders.length === 0 ? (
              'No orders found. Upload your first noon orders file to get started.'
            ) : (
              'No orders match your search criteria.'
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}