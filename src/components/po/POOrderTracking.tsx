import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Package, Filter, SortAsc } from 'lucide-react';
import { POOrder } from '@/hooks/usePOTracker';
import { POGroupCard } from './POGroupCard';

interface POOrderTrackingProps {
  orders: POOrder[];
  onUpdateStatus: (orderId: string, status: POOrder['status']) => void;
  onUpdateTracking: (orderId: string, trackingData: any) => void;
  isLoading?: boolean;
}

export function POOrderTracking({ orders, onUpdateStatus, onUpdateTracking, isLoading }: POOrderTrackingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'po_number' | 'status' | 'total_cost' | 'created_at'>('created_at');

  // Group orders by PO number
  const groupedOrders = useMemo(() => {
    return orders.reduce((groups, order) => {
      const poNumber = order.po_number;
      if (!groups[poNumber]) {
        groups[poNumber] = [];
      }
      groups[poNumber].push(order);
      return groups;
    }, {} as Record<string, POOrder[]>);
  }, [orders]);

  // Filter and sort grouped orders
  const filteredAndSortedGroups = useMemo(() => {
    let filteredGroups = Object.entries(groupedOrders);

    // Filter by search term
    if (searchTerm) {
      filteredGroups = filteredGroups.filter(([poNumber, orders]) =>
        poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orders.some(order => 
          order.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.ship_to_location?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filteredGroups = filteredGroups.filter(([_, orders]) =>
        orders.some(order => order.status === statusFilter)
      );
    }

    // Sort groups
    filteredGroups.sort(([poA, ordersA], [poB, ordersB]) => {
      switch (sortBy) {
        case 'po_number':
          return poA.localeCompare(poB);
        case 'status':
          const getGroupStatus = (orders: POOrder[]) => {
            const statuses = orders.map(o => o.status);
            if (statuses.every(s => s === 'delivered')) return 'delivered';
            if (statuses.some(s => s === 'cancelled')) return 'mixed';
            if (statuses.some(s => s === 'shipped')) return 'shipped';
            if (statuses.some(s => s === 'ordered')) return 'ordered';
            return 'pending';
          };
          return getGroupStatus(ordersA).localeCompare(getGroupStatus(ordersB));
        case 'total_cost':
          const getTotalCost = (orders: POOrder[]) => 
            orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
          return getTotalCost(ordersB) - getTotalCost(ordersA);
        case 'created_at':
        default:
          const getLatestDate = (orders: POOrder[]) =>
            Math.max(...orders.map(order => new Date(order.created_at).getTime()));
          return getLatestDate(ordersB) - getLatestDate(ordersA);
      }
    });

    return filteredGroups;
  }, [groupedOrders, searchTerm, statusFilter, sortBy]);

  const totalPOs = Object.keys(groupedOrders).length;
  const totalItems = orders.length;
  const pendingCount = Object.values(groupedOrders).filter(orders => 
    orders.some(order => order.status === 'pending')
  ).length;

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No PO Orders Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Upload a PO file to start tracking your purchase orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total PO Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPOs}</div>
            <p className="text-xs text-muted-foreground">Unique purchase orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Individual order items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">POs with Pending Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by PO number, ASIN, title, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-[150px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Latest First</SelectItem>
                  <SelectItem value="po_number">PO Number</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="total_cost">Total Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedGroups.length} of {totalPOs} PO numbers
          {searchTerm && ` matching "${searchTerm}"`}
          {statusFilter !== 'all' && ` with ${statusFilter} status`}
        </p>
      </div>

      {/* PO Groups */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading orders...</span>
            </CardContent>
          </Card>
        ) : filteredAndSortedGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Match Your Filters</h3>
              <p className="text-muted-foreground text-center">
                Try adjusting your search terms or filters to see more results.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedGroups.map(([poNumber, orders]) => (
            <POGroupCard
              key={poNumber}
              poNumber={poNumber}
              orders={orders}
              onUpdateStatus={onUpdateStatus}
              onUpdateTracking={onUpdateTracking}
            />
          ))
        )}
      </div>
    </div>
  );
}