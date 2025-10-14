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
  Filter,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { useSKUManager } from '@/hooks/useSKUManager';
import { SunskyOrderDialog } from './SunskyOrderDialog';
import { SunskyCredentialsSelector } from './SunskyCredentialsSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

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
    updateOrderStatus,
    refreshOrders 
  } = useNoonOrders();
  
  // States
  const [showSunskyOrderDialog, setShowSunskyOrderDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // Filter orders that can be placed to Sunsky
  const allOrders = orders.filter(order => 
    order.partner_sku && 
    !order.sunsky_order_number &&
    (selectedStoreId === '' || order.selected_store_id === selectedStoreId)
  );

  // Initially show all orders as ready for Sunsky (we'll check availability when placing the order)
  const readyOrders = allOrders;
  const manualReviewOrders: any[] = []; // Empty initially - items will be moved here if unavailable during order placement

  // Apply filters to both categories
  const filteredReadyOrders = readyOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    const matchesStore = storeFilter === 'all' || order.selected_store_id === storeFilter;
    return matchesStatus && matchesStore;
  });

  const filteredManualOrders = manualReviewOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    const matchesStore = storeFilter === 'all' || order.selected_store_id === storeFilter;
    return matchesStatus && matchesStore;
  });

  const handleClearAllOrders = async () => {
    if (!confirm('Are you sure you want to delete ALL orders? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('noon_orders')
        .delete()
        .eq('user_id' as any, user.id as any);

      if (error) throw error;

      // Refresh the orders list
      await refreshOrders();
      
      toast({
        title: "Success",
        description: "All orders have been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast({
        title: "Error",
        description: "Failed to delete orders",
        variant: "destructive"
      });
    }
  };

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

    // Check SKU availability in real-time before placing the order
    const uniquePartnerSkus = [...new Set(selectedOrders.map(order => order.partner_sku!))];
    
    try {
      const { data, error } = await supabase.functions.invoke('sunsky-api', {
        body: {
          action: 'search_products',
          credentials_id: selectedCredentialId,
          search_skus: uniquePartnerSkus
        }
      });

      if (error) throw error;
      
      const availableSkus = data?.available_skus || [];
      const validOrders = selectedOrders.filter(order => 
        availableSkus.includes(order.partner_sku!)
      );
      const invalidOrders = selectedOrders.filter(order => 
        !availableSkus.includes(order.partner_sku!)
      );

      if (invalidOrders.length > 0) {
        const invalidSkus = invalidOrders.map(order => order.partner_sku).join(', ');
        toast({
          title: "Some SKUs Not Available",
          description: `${invalidOrders.length} orders have unavailable SKUs: ${invalidSkus}. Only ${validOrders.length} orders will be processed.`,
          variant: "destructive"
        });
      }

      if (validOrders.length === 0) {
        toast({
          title: "No Valid Orders",
          description: "All selected orders have SKUs that are not available in Sunsky catalog",
          variant: "destructive"
        });
        return;
      }

      // Update selected orders to only include valid ones
      setSelectedOrders(validOrders);
      setShowSunskyOrderDialog(true);
      
    } catch (error) {
      console.error('Error checking Sunsky SKU availability:', error);
      toast({
        title: "Error",
        description: "Failed to verify SKU availability. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSunskyOrderSuccess = async (orderNumber: string, selectedOrderIds: string[]) => {
    console.log('🚀 Sunsky order success callback:', { orderNumber, selectedOrderIds, selectedCredentialId });
    
    try {
      // Update the orders with Sunsky order number
      for (const orderId of selectedOrderIds) {
        console.log('📝 Updating order:', orderId, 'with Sunsky order number:', orderNumber);
        
        const result = await updateOrderStatus(orderId, { 
          sunsky_order_number: orderNumber,
          sunsky_order_status: 1, // Pending
          sunsky_credentials_id: selectedCredentialId,
          sunsky_last_sync: new Date().toISOString(),
          item_status: 'ordered'
        });
        
        console.log('✅ Order update result for', orderId, ':', result);
      }

      setSelectedOrders([]);
      setShowSunskyOrderDialog(false);
      onOrdersPlaced?.();
      
      toast({
        title: "Orders Placed Successfully",
        description: `${selectedOrderIds.length} orders placed with Sunsky. Order number: ${orderNumber}`,
      });
    } catch (error) {
      console.error('❌ Error updating orders after Sunsky placement:', error);
      toast({
        title: "Warning",
        description: "Order placed with Sunsky but there was an issue updating the database. Please refresh to see the latest status.",
        variant: "destructive"
      });
    }
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
            variant="outline"
            onClick={handleClearAllOrders}
            className="text-red-600 hover:text-red-700"
          >
            Clear All Orders
          </Button>
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

      {/* Ready for Sunsky Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready for Sunsky ({filteredReadyOrders.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedOrders(
                  selectedOrders.length === filteredReadyOrders.length ? [] : filteredReadyOrders
                )}
              >
                {selectedOrders.length === filteredReadyOrders.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
                  <p className="text-sm text-muted-foreground">
                    Orders with partner SKUs (availability will be verified when placing order)
                  </p>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading orders...
            </div>
          ) : filteredReadyOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders ready for Sunsky placement
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Select</div>
                <div>Order #</div>
                <div>Partner SKU</div>
                <div>Title</div>
                <div>Quantity</div>
                <div>Status</div>
                <div>Store</div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredReadyOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="grid grid-cols-7 gap-4 items-center p-3 border rounded-lg hover:bg-muted/50 bg-green-50/50"
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
                    <div className="text-sm font-medium text-green-700">{order.partner_sku}</div>
                    <div className="text-sm truncate" title={order.title}>
                      {order.title || order.partner_sku}
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

      {/* Manual Review Required Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Manual Review Required ({filteredManualOrders.length})
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Orders requiring manual review (will show here if SKUs are unavailable during order placement)
          </p>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading orders...
            </div>
          ) : manualReviewOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders requiring manual review (SKUs will be verified when placing orders)
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Order #</div>
                <div>Partner SKU</div>
                <div>Title</div>
                <div>Quantity</div>
                <div>Status</div>
                <div>Store</div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-1">
                {manualReviewOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="grid grid-cols-6 gap-4 items-center p-3 border rounded-lg bg-orange-50/50"
                  >
                    <div className="font-medium">{order.order_nr}</div>
                    <div className="text-sm font-medium text-orange-700">{order.partner_sku}</div>
                    <div className="text-sm truncate" title={order.title}>
                      {order.title || order.partner_sku}
                    </div>
                    <div className="text-sm">{order.quantity}</div>
                    <div>{getStatusBadge(order.order_status || 'pending')}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      Store ID: {order.selected_store_id || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-orange-100/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Action Required</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Orders will appear here if their partner SKUs are not available in the Sunsky catalog during order placement. 
                      SKU availability is verified in real-time when you place orders.
                    </p>
                  </div>
                </div>
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
                    {new Set(selectedOrders.map(order => order.partner_sku)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Unique Partner SKUs</div>
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