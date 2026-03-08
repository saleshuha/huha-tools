import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Package, RefreshCw } from 'lucide-react';
import { FBPIOrderDetail } from './FBPIOrderDetail';
import type { FBPIOrder, NoonStoreConfig } from '@/hooks/useNoonFBPI';
import { format } from 'date-fns';

interface FBPIOrdersListProps {
  stores: NoonStoreConfig[];
  orders: FBPIOrder[];
  loading: boolean;
  onFetchOrder: (storeId: string, orderNr: string) => Promise<any>;
  onUpdateOrder: (storeId: string, payload: any) => Promise<any>;
  onRefresh: () => void;
}

export function FBPIOrdersList({ stores, orders, loading, onFetchOrder, onUpdateOrder, onRefresh }: FBPIOrdersListProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [orderNr, setOrderNr] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<FBPIOrder | null>(null);

  const configuredStores = stores.filter(s => s.api_key_id);

  const handleFetch = async () => {
    if (!selectedStoreId || !orderNr.trim()) return;
    const result = await onFetchOrder(selectedStoreId, orderNr.trim());
    if (result) setOrderNr('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-600';
      case 'low_stock': return 'bg-yellow-600';
      case 'out_of_stock': return 'bg-red-600';
      default: return 'bg-muted';
    }
  };

  const getOverallStatus = (inventoryStatus: Record<string, any>) => {
    const statuses = Object.values(inventoryStatus).map(s => s.status);
    if (statuses.every(s => s === 'in_stock')) return 'in_stock';
    if (statuses.some(s => s === 'out_of_stock')) return 'out_of_stock';
    return 'low_stock';
  };

  if (selectedOrder) {
    return (
      <FBPIOrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onUpdateOrder={onUpdateOrder}
        stores={stores}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Fetch Order Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Fetch FBPI Order
          </CardTitle>
          <CardDescription>
            Enter a FBPI order number to fetch and check inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-[200px]">
              <Label>Store</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store..." />
                </SelectTrigger>
                <SelectContent>
                  {configuredStores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 max-w-[300px]">
              <Label>FBPI Order Number</Label>
              <Input
                value={orderNr}
                onChange={(e) => setOrderNr(e.target.value)}
                placeholder="Enter order number..."
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              />
            </div>
            <Button onClick={handleFetch} disabled={loading || !selectedStoreId || !orderNr.trim()}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Fetch Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                FBPI Orders ({orders.length})
              </CardTitle>
              <CardDescription>Orders fetched from Noon with inventory status</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No FBPI orders fetched yet</p>
              <p className="text-sm">Use the search above to fetch an order by number</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>MP Order</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fetched</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => {
                  const invStatus = (order.inventory_status && typeof order.inventory_status === 'object')
                    ? order.inventory_status
                    : {};
                  const overall = Object.keys(invStatus).length > 0
                    ? getOverallStatus(invStatus)
                    : 'unknown';

                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell className="font-mono font-medium">{order.fbpi_order_nr}</TableCell>
                      <TableCell>{order.mp_order_nr || '-'}</TableCell>
                      <TableCell>{order.mp_country_code || '-'}</TableCell>
                      <TableCell>{Array.isArray(order.items) ? order.items.length : 0}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(overall)}>
                          {overall.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.fetched_at ? format(new Date(order.fetched_at), 'MMM dd, HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
