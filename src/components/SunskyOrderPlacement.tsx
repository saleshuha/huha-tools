import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Package, 
  AlertCircle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { SunskyOrderDialog } from './SunskyOrderDialog';
import { SunskyCredentialsSelector } from './SunskyCredentialsSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SunskyOrderPlacementProps {
  selectedStoreId: string;
  onOrdersPlaced?: () => void;
}

export function SunskyOrderPlacement({ 
  selectedStoreId, 
  onOrdersPlaced 
}: SunskyOrderPlacementProps) {
  const { toast } = useToast();
  const { 
    orders, 
    loading: ordersLoading, 
    updateOrderStatus 
  } = useNoonOrders();

  // States
  const [showSunskyOrderDialog, setShowSunskyOrderDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // Filter orders that can be placed to Sunsky
  const allOrders = orders.filter(order => 
    order.sku && 
    !order.sunsky_order_number &&
    (selectedStoreId === '' || order.selected_store_id === selectedStoreId)
  );

  const filteredOrders = allOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    const matchesStore = storeFilter === 'all' || order.selected_store_id === storeFilter;
    return matchesStatus && matchesStore;
  });

  const handlePlaceOrdersToSunsky = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select orders to place with Sunsky",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCredentialId) {
      toast({
        title: "No API Credentials Selected",
        description: "Please select Sunsky API credentials",
        variant: "destructive"
      });
      return;
    }

    setShowSunskyOrderDialog(true);
  };

  const handleSunskyOrderSuccess = async (orderNumber: string, selectedOrderIds: string[]) => {
    // Update the orders with Sunsky order number
    for (const orderId of selectedOrderIds) {
      await updateOrderStatus(orderId, { 
        sunsky_order_number: orderNumber,
        sunsky_order_status: 1, // Pending
        sunsky_credentials_id: selectedCredentialId
      });
    }

    setSelectedOrders([]);
    setShowSunskyOrderDialog(false);
    onOrdersPlaced?.();
    
    toast({
      title: "Orders Placed Successfully",
      description: `${selectedOrderIds.length} orders placed with Sunsky. Order number: ${orderNumber}`,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'secondary', icon: Clock },
      'processing': { color: 'default', icon: Package },
      'shipped': { color: 'default', icon: Package },
      'delivered': { color: 'default', icon: CheckCircle },
      'cancelled': { color: 'destructive', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Get unique stores for filter
  const uniqueStores = Array.from(new Set(allOrders.map(order => order.selected_store_id)))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Place Orders to Sunsky</h2>
        </div>
        <div className="flex items-center gap-4">
          <SunskyCredentialsSelector 
            selectedCredentialId={selectedCredentialId}
            onCredentialSelect={setSelectedCredentialId}
          />
          <Button 
            onClick={handlePlaceOrdersToSunsky}
            disabled={selectedOrders.length === 0 || !selectedCredentialId}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Place Selected Orders ({selectedOrders.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Order Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Available Orders ({filteredOrders.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedOrders(
                  selectedOrders.length === filteredOrders.length ? [] : filteredOrders
                )}
              >
                {selectedOrders.length === filteredOrders.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders available to place with Sunsky
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Select</div>
                <div>Order #</div>
                <div>SKU</div>
                <div>Title</div>
                <div>Quantity</div>
                <div>Status</div>
                <div>Store</div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="grid grid-cols-7 gap-4 items-center p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div>
                      <Checkbox 
                        checked={selectedOrders.some(selected => selected.id === order.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders(prev => [...prev, order]);
                          } else {
                            setSelectedOrders(prev => prev.filter(selected => selected.id !== order.id));
                          }
                        }}
                      />
                    </div>
                    <div className="font-medium">{order.order_nr}</div>
                    <div className="text-sm text-muted-foreground">{order.sku}</div>
                    <div className="text-sm truncate" title={order.title}>
                      {order.title || order.sku}
                    </div>
                    <div className="text-sm">{order.quantity}</div>
                    <div>{getStatusBadge(order.order_status || 'pending')}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Store ID: {order.selected_store_id || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      {selectedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{selectedOrders.length}</div>
                <div className="text-sm text-muted-foreground">Orders Selected</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {selectedOrders.reduce((sum, order) => sum + order.quantity, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {new Set(selectedOrders.map(order => order.sku)).size}
                </div>
                <div className="text-sm text-muted-foreground">Unique SKUs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <SunskyOrderDialog 
        open={showSunskyOrderDialog}
        onOpenChange={setShowSunskyOrderDialog}
        selectedOrders={selectedOrders}
        onOrderSuccess={handleSunskyOrderSuccess}
      />
    </div>
  );
}