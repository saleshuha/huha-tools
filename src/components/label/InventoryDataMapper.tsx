import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, Database, Package } from 'lucide-react';
import { useInventoryData } from '@/hooks/useInventoryData';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { toast } from 'sonner';

export const InventoryDataMapper: React.FC = () => {
  const { 
    inventory, 
    orders, 
    noonOrders,
    loading, 
    error, 
    fetchInventory, 
    fetchProcessedOrders, 
    fetchNoonOrders,
    getInventoryDataset, 
    getOrdersDataset, 
    getNoonOrdersDataset,
    searchInventory,
    searchNoonOrders
  } = useInventoryData();
  
  const { setDataset, dataset } = useLabelDoc();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState<'inventory' | 'orders' | 'noon-orders'>('inventory');
  
  const filteredInventory = searchInventory(searchTerm);
  const filteredNoonOrders = searchNoonOrders(searchTerm);

  const handleLoadInventoryData = async () => {
    try {
      const inventoryDataset = getInventoryDataset();
      setDataset(inventoryDataset);
      toast.success('Inventory data loaded for label mapping');
    } catch (error) {
      toast.error('Failed to load inventory data');
    }
  };

  const handleLoadNoonOrdersData = async () => {
    try {
      const noonOrdersDataset = getNoonOrdersDataset();
      setDataset(noonOrdersDataset);
      toast.success('Noon orders data loaded for label mapping');
    } catch (error) {
      toast.error('Failed to load noon orders data');
    }
  };

  const handleLoadOrdersData = async () => {
    try {
      const ordersDataset = getOrdersDataset();
      setDataset(ordersDataset);
      toast.success('Orders data loaded for label mapping');
    } catch (error) {
      toast.error('Failed to load orders data');
    }
  };

  const handleRefresh = () => {
    if (selectedDataSource === 'inventory') {
      fetchInventory();
    } else if (selectedDataSource === 'orders') {
      fetchProcessedOrders();
    } else if (selectedDataSource === 'noon-orders') {
      fetchNoonOrders();
    }
  };

  return (
    <Card className="w-80 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Mapping
        </CardTitle>
         <p className="text-sm text-muted-foreground">
           Map label elements to inventory, orders, or noon order data
         </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Source Selection */}
        <div className="grid grid-cols-3 gap-1">
          <Button
            variant={selectedDataSource === 'inventory' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDataSource('inventory')}
            className="text-xs"
          >
            <Package className="h-3 w-3 mr-1" />
            Inventory
          </Button>
          <Button
            variant={selectedDataSource === 'orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDataSource('orders')}
            className="text-xs"
          >
            <Package className="h-3 w-3 mr-1" />
            Orders
          </Button>
          <Button
            variant={selectedDataSource === 'noon-orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDataSource('noon-orders')}
            className="text-xs"
          >
            <Package className="h-3 w-3 mr-1" />
            Noon
          </Button>
        </div>

        {/* Current Dataset Status */}
        {dataset && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Current Dataset</Label>
              <Badge variant="secondary">{dataset.rowCount} rows</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{dataset.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{dataset.description}</p>
          </div>
        )}

        {/* Load Data Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={
                selectedDataSource === 'inventory' ? handleLoadInventoryData : 
                selectedDataSource === 'orders' ? handleLoadOrdersData : 
                handleLoadNoonOrdersData
              }
              size="sm"
              className="flex-1"
              disabled={loading}
            >
              <Database className="h-4 w-4 mr-2" />
              Load {selectedDataSource === 'inventory' ? 'Inventory' : selectedDataSource === 'orders' ? 'Orders' : 'Noon'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label className="text-sm">Search Data</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${selectedDataSource}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-8"
            />
          </div>
        </div>

        {/* Data Preview */}
        <Tabs value={selectedDataSource} onValueChange={(value) => setSelectedDataSource(value as 'inventory' | 'orders' | 'noon-orders')}>
          <TabsContent value="inventory" className="space-y-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Inventory Items</Label>
                <Badge variant="outline">{filteredInventory.length} items</Badge>
              </div>
              
              {filteredInventory.slice(0, 10).map((item) => (
                <div key={item.id} className="p-2 border rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={item.type === 'asin' ? 'default' : 'secondary'} className="text-xs">
                      {item.type.toUpperCase()}
                    </Badge>
                    <Badge variant={item.quantity > 0 ? 'default' : 'destructive'} className="text-xs">
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                  <p className="font-medium truncate">{item.title}</p>
                  {item.asin && <p className="text-muted-foreground">ASIN: {item.asin}</p>}
                  {(item.sku || item.sku_number) && (
                    <p className="text-muted-foreground">SKU: {item.sku || item.sku_number}</p>
                  )}
                </div>
              ))}
              
              {filteredInventory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No inventory items found
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Recent Orders</Label>
                <Badge variant="outline">{orders.length} orders</Badge>
              </div>
              
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="p-2 border rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{order.order_number}</p>
                    <Badge variant="secondary" className="text-xs">
                      Qty: {order.quantity_processed}
                    </Badge>
                  </div>
                  {order.item_title && <p className="text-muted-foreground truncate">{order.item_title}</p>}
                  {order.asin && <p className="text-muted-foreground">ASIN: {order.asin}</p>}
                  {order.sku && <p className="text-muted-foreground">SKU: {order.sku}</p>}
                  <p className="text-muted-foreground">
                    {order.match_type} | {order.inventory_type}
                  </p>
                </div>
              ))}
              
              {orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No processed orders found
                </p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="noon-orders" className="space-y-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Noon Orders</Label>
                <Badge variant="outline">{filteredNoonOrders.length} orders</Badge>
              </div>
              
              {filteredNoonOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="p-2 border rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{order.order_nr}</p>
                    <Badge variant="secondary" className="text-xs">
                      Qty: {order.quantity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{order.purchase_item_nr}</p>
                  {order.title && <p className="text-muted-foreground truncate">{order.title}</p>}
                  {order.sku && <p className="text-muted-foreground">SKU: {order.sku}</p>}
                  {order.partner_sku && <p className="text-muted-foreground">Partner SKU: {order.partner_sku}</p>}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {order.item_status}
                    </Badge>
                    {order.file_name && (
                      <span className="text-xs text-muted-foreground truncate">{order.file_name}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredNoonOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No noon orders found
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-destructive/10 border-2 border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Quick Mapping Guide */}
        <div className="p-3 bg-muted rounded-lg text-xs space-y-2">
          <p className="font-medium">Quick Mapping Guide:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Load data first using the buttons above</li>
            <li>• Select a label element to map data columns</li>
            <li>• Use ASIN, SKU, or Title columns for content</li>
            <li>• Preview labels before printing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};