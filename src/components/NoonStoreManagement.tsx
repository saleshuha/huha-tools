import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Store, 
  Plus, 
  Package, 
  Truck, 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNoonStores } from '@/hooks/useNoonStores';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';
import { AddStoreDialog } from './AddStoreDialog';
import { SunskyOrderDialog } from './SunskyOrderDialog';
import { SunskyCredentialsSelector } from './SunskyCredentialsSelector';

interface NoonStoreManagementProps {
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
  onOrdersPlaced?: () => void;
}

export function NoonStoreManagement({ 
  selectedStoreId, 
  onStoreChange, 
  onOrdersPlaced 
}: NoonStoreManagementProps) {
  const { toast } = useToast();
  const { stores, loading: storesLoading, addStore, refreshStores } = useNoonStores();
  const { 
    orders, 
    loading: ordersLoading, 
    placeOrderWithSunsky, 
    syncOrderStatus,
    updateOrderStatus 
  } = useNoonOrders();
  const { orders: sunskyOrders, loading: sunskyLoading, syncOrdersFromAPI } = useSunskyOrders();

  // States
  const [activeTab, setActiveTab] = useState('stores');
  const [showAddStoreDialog, setShowAddStoreDialog] = useState(false);
  const [showSunskyOrderDialog, setShowSunskyOrderDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');

  // Filter orders that can be placed to Sunsky
  const placeableOrders = orders.filter(order => 
    order.sku && 
    !order.sunsky_order_number && 
    order.order_status !== 'cancelled'
  );

  // Filter orders that have been placed to Sunsky
  const sunskyPlacedOrders = orders.filter(order => 
    order.sunsky_order_number
  );

  const handlePlaceOrdersToSunsky = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select orders to place with Sunsky",
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
        sunsky_order_status: 1 // Pending
      });
    }

    setSelectedOrders([]);
    setShowSunskyOrderDialog(false);
    onOrdersPlaced?.();
    
    toast({
      title: "Orders Placed Successfully",
      description: `Orders placed with Sunsky. Order number: ${orderNumber}`,
    });
  };

  const handleSyncSunskyStatus = async (orderId: string) => {
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

  const handleBulkSyncSunsky = async () => {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'secondary', icon: Clock },
      'processing': { color: 'default', icon: Package },
      'shipped': { color: 'default', icon: Truck },
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

  return (
    <div className="space-y-6">
      {/* Header with Credentials Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Store className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Store & Sunsky Management</h2>
        </div>
        <div className="flex items-center gap-4">
          <SunskyCredentialsSelector 
            selectedCredentialId={selectedCredentialId}
            onCredentialSelect={setSelectedCredentialId}
          />
          <Button onClick={handleBulkSyncSunsky} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All Sunsky Orders
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stores">Store Configuration</TabsTrigger>
          <TabsTrigger value="place-orders">Place Orders to Sunsky</TabsTrigger>
          <TabsTrigger value="track-orders">Track Placed Orders</TabsTrigger>
        </TabsList>

        {/* Store Configuration Tab */}
        <TabsContent value="stores" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Noon Store Configuration</h3>
            <Button onClick={() => setShowAddStoreDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Store
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {storesLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No stores configured. Add your first store to get started.
              </div>
            ) : (
              stores.map((store) => (
                <Card 
                  key={store.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedStoreId === store.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onStoreChange(store.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      {store.name}
                      <Badge variant="outline">{store.country}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Partner ID: {store.partner_id}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Place Orders Tab */}
        <TabsContent value="place-orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Place Orders to Sunsky ({placeableOrders.length} available)
            </h3>
            <Button 
              onClick={handlePlaceOrdersToSunsky}
              disabled={selectedOrders.length === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Place Selected Orders ({selectedOrders.length})
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {placeableOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders available to place with Sunsky
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Select Orders to Place:</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedOrders(
                        selectedOrders.length === placeableOrders.length ? [] : placeableOrders
                      )}
                    >
                      {selectedOrders.length === placeableOrders.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {placeableOrders.map((order) => (
                      <div 
                        key={order.id} 
                        className="flex items-center space-x-3 p-3 border rounded-lg"
                      >
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
                        <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <strong>{order.order_nr}</strong>
                          </div>
                          <div>{order.sku}</div>
                          <div>Qty: {order.quantity}</div>
                          <div>{getStatusBadge(order.order_status || 'pending')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Track Orders Tab */}
        <TabsContent value="track-orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Track Placed Orders ({sunskyPlacedOrders.length} placed)
            </h3>
          </div>

          <Card>
            <CardContent className="p-6">
              {sunskyPlacedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders have been placed with Sunsky yet
                </div>
              ) : (
                <div className="space-y-4">
                  {sunskyPlacedOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="grid grid-cols-5 gap-4 flex-1 text-sm">
                        <div>
                          <div className="font-medium">{order.order_nr}</div>
                          <div className="text-muted-foreground">{order.sku}</div>
                        </div>
                        <div>
                          <div className="font-medium">Sunsky Order</div>
                          <div className="text-muted-foreground">{order.sunsky_order_number}</div>
                        </div>
                        <div>
                          <div className="font-medium">Quantity</div>
                          <div className="text-muted-foreground">{order.quantity}</div>
                        </div>
                        <div>
                          <div className="font-medium">Status</div>
                          <div>{getStatusBadge(order.order_status || 'pending')}</div>
                        </div>
                        <div>
                          <div className="font-medium">Tracking</div>
                          <div className="text-muted-foreground">
                            {order.sunsky_tracking_number || 'Not available'}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSyncSunskyStatus(order.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Status
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddStoreDialog 
        open={showAddStoreDialog}
        onOpenChange={setShowAddStoreDialog}
        onStoreAdded={refreshStores}
      />

      <SunskyOrderDialog 
        open={showSunskyOrderDialog}
        onOpenChange={setShowSunskyOrderDialog}
        selectedOrders={selectedOrders}
        onOrderSuccess={handleSunskyOrderSuccess}
      />
    </div>
  );
}