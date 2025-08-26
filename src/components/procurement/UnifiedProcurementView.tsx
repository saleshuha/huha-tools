import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Clock, CheckCircle, Truck, RefreshCw, Search, Filter, TrendingUp, ShoppingCart, AlertCircle } from 'lucide-react';
import { useProcurementUnified, UnifiedProcurementItem } from '@/hooks/useProcurementUnified';
import { RestockItemCard } from './RestockItemCard';
import { POItemCard } from './POItemCard';
import { SunskyItemCard } from './SunskyItemCard';

const sourceColors = {
  restock: 'bg-red-500/10 text-red-700 border-red-200',
  po: 'bg-blue-500/10 text-blue-700 border-blue-200',
  sunsky: 'bg-green-500/10 text-green-700 border-green-200'
};

const statusColors = {
  'pending': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'ordered': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'shipped': 'bg-purple-500/10 text-purple-700 border-purple-200',
  'delivered': 'bg-green-500/10 text-green-700 border-green-200',
  'cancelled': 'bg-red-500/10 text-red-700 border-red-200',
  'in-stock': 'bg-gray-500/10 text-gray-700 border-gray-200',
  'sold': 'bg-yellow-500/10 text-yellow-700 border-yellow-200'
};

export const UnifiedProcurementView = () => {
  const { unifiedItems, isLoading, refetch, metrics } = useProcurementUnified();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'restock' | 'po' | 'sunsky'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const filteredItems = useMemo(() => {
    let filtered = [...unifiedItems];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.sku?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.po_number?.toLowerCase().includes(query) ||
        item.model_number?.toLowerCase().includes(query)
      );
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(item => item.source === sourceFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [unifiedItems, searchQuery, sourceFilter, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'ordered': return <ShoppingCart className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'in-stock': return <Package className="h-4 w-4" />;
      case 'sold': return <TrendingUp className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const renderItemCard = (item: UnifiedProcurementItem) => {
    switch (item.source) {
      case 'restock':
        return <RestockItemCard key={`${item.source}-${item.item_id}`} item={item} />;
      case 'po':
        return <POItemCard key={`${item.source}-${item.po_id}`} item={item} />;
      case 'sunsky':
        return <SunskyItemCard key={`${item.source}-${item.sunsky_order_number}-${item.sku}`} item={item} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Unified Procurement Dashboard</h2>
          <p className="text-muted-foreground">Complete view of restock needs, PO orders, and Sunsky fulfillment</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" style={{ animationPlayState: isLoading ? 'running' : 'paused' }} />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Restock Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.restockItems}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PO Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.poItems}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sunsky Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.sunskyItems}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.orderedItems}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{metrics.deliveredItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Procurement Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search SKU, title, PO number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="po">PO Orders</SelectItem>
                <SelectItem value="sunsky">Sunsky</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8"
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="h-8"
              >
                Cards
              </Button>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'table' ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>SKU / Model</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => (
                    <TableRow key={`${item.source}-${item.item_id || item.po_id || item.sunsky_order_number}-${index}`}>
                      <TableCell>
                        <Badge className={sourceColors[item.source]}>
                          {item.source.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.model_number || item.sku}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        {item.po_number && (
                          <Badge variant="outline">{item.po_number}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.status] || statusColors['pending']}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {item.status}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.tracking_number && (
                          <Badge variant="outline" className="font-mono">
                            {item.tracking_number}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => renderItemCard(item))}
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No items found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};