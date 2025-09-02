import React, { useState } from 'react';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { useNoonStores } from '@/hooks/useNoonStores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Search, Filter, Plus, Eye } from 'lucide-react';
import { AddStoreDialog } from '@/components/AddStoreDialog';

interface NoonOrdersTableProps {
  selectedStoreId?: string;
  onStoreChange?: (storeId: string) => void;
}

export function NoonOrdersTable({ selectedStoreId, onStoreChange }: NoonOrdersTableProps) {
  const { orders, loading } = useNoonOrders();
  const { stores } = useNoonStores();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddStore, setShowAddStore] = useState(false);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_nr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.purchase_item_nr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.partner_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    
    const matchesStore = !selectedStoreId || order.selected_store_id === selectedStoreId;
    
    return matchesSearch && matchesStatus && matchesStore;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground animate-pulse" />
            <p className="mt-2 text-sm text-muted-foreground">Loading orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Store Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Store Management
              </CardTitle>
              <CardDescription>
                Manage your Noon stores and their configurations
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddStore(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Store
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stores.map(store => (
              <div 
                key={store.id} 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedStoreId === store.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onStoreChange?.(store.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{store.name}</h3>
                    <p className="text-sm text-muted-foreground">Partner ID: {store.partner_id}</p>
                    <p className="text-xs text-muted-foreground">{store.country}</p>
                  </div>
                  <Badge variant={store.is_active ? 'default' : 'secondary'}>
                    {store.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
            {stores.length === 0 && (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                No stores configured. Add your first store to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Orders ({filteredOrders.length})
              </CardTitle>
              <CardDescription>
                View and manage your uploaded Noon orders
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, purchase items, SKUs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Orders Table */}
          {filteredOrders.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Purchase Item #</TableHead>
                    <TableHead>Partner SKU</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.order_nr}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.purchase_item_nr}
                      </TableCell>
                      <TableCell>{order.partner_sku || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {order.title || 'N/A'}
                      </TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.order_status)}>
                          {order.order_status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.order_country_code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No orders found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Upload your first orders to get started'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddStoreDialog 
        open={showAddStore} 
        onOpenChange={setShowAddStore}
        onStoreAdded={() => setShowAddStore(false)}
      />
    </div>
  );
}