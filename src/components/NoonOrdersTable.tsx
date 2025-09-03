import React, { useState } from 'react';
import { useNoonOrders } from '@/hooks/useNoonOrders';
import { useNoonStores } from '@/hooks/useNoonStores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Package, Search, Filter, Plus, Eye, LayoutGrid, Calendar, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AddStoreDialog } from '@/components/AddStoreDialog';

interface NoonOrdersTableProps {
  selectedStoreId?: string;
  onStoreChange?: (storeId: string) => void;
}

type ViewMode = 'default' | 'sunsky-groups' | 'date-groups';
type SortField = 'order_nr' | 'title' | 'order_status' | 'quantity' | 'order_received_at' | 'order_country_code';
type SortDirection = 'asc' | 'desc' | null;

export function NoonOrdersTable({ selectedStoreId, onStoreChange }: NoonOrdersTableProps) {
  const { orders, loading } = useNoonOrders();
  const { stores } = useNoonStores();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddStore, setShowAddStore] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const filteredAndSortedOrders = React.useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.order_nr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.purchase_item_nr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.partner_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
      
      const matchesStore = !selectedStoreId || order.selected_store_id === selectedStoreId;
      
      return matchesSearch && matchesStatus && matchesStore;
    });

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];
        
        // Handle different data types
        if (sortField === 'order_received_at' && aValue && bValue) {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          // Numbers are already comparable
        } else {
          // Convert to strings for comparison
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }
    
    return filtered;
  }, [orders, searchTerm, statusFilter, selectedStoreId, sortField, sortDirection]);

  // Group orders based on view mode
  const groupedOrders = React.useMemo(() => {
    if (viewMode === 'sunsky-groups') {
      const groups = new Map<string, typeof filteredAndSortedOrders>();
      filteredAndSortedOrders.forEach(order => {
        const key = order.sunsky_order_number || 'No Sunsky Order';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(order);
      });
      return Array.from(groups.entries()).map(([key, orders]) => ({
        groupKey: key,
        orders: orders.sort((a, b) => a.order_nr.localeCompare(b.order_nr))
      }));
    } else if (viewMode === 'date-groups') {
      const groups = new Map<string, typeof filteredAndSortedOrders>();
      filteredAndSortedOrders.forEach(order => {
        const date = order.order_received_at || order.created_at;
        const key = date ? new Date(date).toDateString() : 'No Date';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(order);
      });
      return Array.from(groups.entries())
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([key, orders]) => ({
          groupKey: key,
          orders: orders.sort((a, b) => a.order_nr.localeCompare(b.order_nr))
        }));
    }
    return [{ groupKey: 'All Orders', orders: filteredAndSortedOrders }];
  }, [filteredAndSortedOrders, viewMode]);

  // Helper function to calculate order metrics for progress bar
  const getOrderMetrics = (orders: typeof filteredAndSortedOrders) => {
    const total = orders.length;
    
    const sunskyPlaced = orders.filter(order => order.sunsky_order_number).length;
    const sunskyProcessed = orders.filter(order => order.sunsky_order_status === 2).length;
    const sunskyShipped = orders.filter(order => order.sunsky_order_status === 3).length;
    const pendingToPlaceSunsky = orders.filter(order => order.partner_sku && !order.sunsky_order_number).length;
    const noonPending = orders.filter(order => !order.order_status || order.order_status === 'pending' || order.order_status === 'uploaded').length;
    
    // Calculate breach orders (orders past their fulfillment date)
    const breachOrders = orders.filter(order => {
      const orderReceivedDate = order.order_received_at ? new Date(order.order_received_at) : null;
      const fulfillmentDate = order.fulfillment_timestamp ? new Date(order.fulfillment_timestamp) : null;
      
      if (!orderReceivedDate) return false;
      
      let targetDate: Date;
      if (order.target_ready_at) {
        targetDate = new Date(order.target_ready_at);
      } else if (fulfillmentDate) {
        const processingTimeMs = fulfillmentDate.getTime() - orderReceivedDate.getTime();
        const standardProcessingTime = Math.max(processingTimeMs, 2 * 24 * 60 * 60 * 1000); // Minimum 2 days
        targetDate = new Date(orderReceivedDate.getTime() + standardProcessingTime);
      } else {
        // Default 2-day processing
        targetDate = new Date(orderReceivedDate.getTime() + (2 * 24 * 60 * 60 * 1000));
      }
      
      return new Date() > targetDate;
    }).length;
    
    return {
      total,
      sunskyPlaced,
      sunskyProcessed,
      sunskyShipped,
      pendingToPlaceSunsky,
      noonPending,
      breachOrders,
      // Calculate percentages
      sunskyPlacedPercent: total > 0 ? (sunskyPlaced / total) * 100 : 0,
      sunskyProcessedPercent: total > 0 ? (sunskyProcessed / total) * 100 : 0,
      sunskyShippedPercent: total > 0 ? (sunskyShipped / total) * 100 : 0,
      pendingToPlaceSunskyPercent: total > 0 ? (pendingToPlaceSunsky / total) * 100 : 0,
      noonPendingPercent: total > 0 ? (noonPending / total) * 100 : 0,
      breachOrdersPercent: total > 0 ? (breachOrders / total) * 100 : 0
    };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 text-primary" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-3 w-3 text-primary" />;
    }
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Auto-expand groups when switching to default view
  React.useEffect(() => {
    if (viewMode === 'default') {
      setExpandedGroups(new Set(['All Orders']));
    } else {
      // For grouped views, start with all collapsed
      setExpandedGroups(new Set());
    }
  }, [viewMode]);

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
      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Orders ({filteredAndSortedOrders.length}{orders.length !== filteredAndSortedOrders.length ? ` of ${orders.length}` : ''})
              </CardTitle>
              <CardDescription>
                View and manage your uploaded Noon orders
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and View Mode */}
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
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <SelectTrigger className="w-48">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="View Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default View</SelectItem>
                  <SelectItem value="sunsky-groups">Group by Sunsky Orders</SelectItem>
                  <SelectItem value="date-groups">Group by Order Date</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Overall Metrics for Default View */}
          {viewMode === 'default' && filteredAndSortedOrders.length > 0 && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              {(() => {
                const metrics = getOrderMetrics(filteredAndSortedOrders);
                return (
                  <div className="space-y-3">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded border">
                        <div className="font-semibold text-blue-800">Total Orders</div>
                        <div className="text-lg font-bold text-blue-900">{metrics.total}</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded border">
                        <div className="font-semibold text-purple-800">Sunsky Placed</div>
                        <div className="text-lg font-bold text-purple-900">{metrics.sunskyPlaced}</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded border">
                        <div className="font-semibold text-yellow-800">Pending Sunsky</div>
                        <div className="text-lg font-bold text-yellow-900">{metrics.pendingToPlaceSunsky}</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded border">
                        <div className="font-semibold text-red-800">Breached</div>
                        <div className="text-lg font-bold text-red-900">{metrics.breachOrders}</div>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Sunsky Shipped: {metrics.sunskyShipped}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Sunsky Processing: {metrics.sunskyProcessed}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        Noon Pending: {metrics.noonPending}
                      </span>
                    </div>
                    
                    {/* Multi-colored progress bar */}
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                      <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${metrics.sunskyShippedPercent}%` }}></div>
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${metrics.sunskyProcessedPercent}%` }}></div>
                      <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${metrics.pendingToPlaceSunskyPercent}%` }}></div>
                      <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${metrics.breachOrdersPercent}%` }}></div>
                      <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${metrics.noonPendingPercent}%` }}></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Orders Table */}
          {filteredAndSortedOrders.length > 0 ? (
            <div className="space-y-6">
              {groupedOrders.map((group, groupIndex) => (
                <div key={group.groupKey} className="border rounded-lg overflow-hidden">
                  {/* Group Header */}
                  {viewMode !== 'default' && (
                    <div 
                      className="bg-muted/30 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGroup(group.groupKey)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(group.groupKey) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {viewMode === 'sunsky-groups' ? (
                              <LayoutGrid className="h-4 w-4" />
                            ) : (
                              <Calendar className="h-4 w-4" />
                            )}
                            <span className="font-medium">{group.groupKey}</span>
                            <Badge variant="outline" className="ml-2">
                              {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Click to {expandedGroups.has(group.groupKey) ? 'collapse' : 'expand'}
                          </span>
                        </div>
                        
                        {/* Order Metrics */}
                        {(() => {
                          const metrics = getOrderMetrics(group.orders);
                          return (
                            <div className="space-y-3">
                              {/* Summary Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div className="bg-blue-50 p-2 rounded border">
                                  <div className="font-semibold text-blue-800">Total Orders</div>
                                  <div className="text-lg font-bold text-blue-900">{metrics.total}</div>
                                </div>
                                <div className="bg-purple-50 p-2 rounded border">
                                  <div className="font-semibold text-purple-800">Sunsky Placed</div>
                                  <div className="text-lg font-bold text-purple-900">{metrics.sunskyPlaced}</div>
                                </div>
                                <div className="bg-yellow-50 p-2 rounded border">
                                  <div className="font-semibold text-yellow-800">Pending Sunsky</div>
                                  <div className="text-lg font-bold text-yellow-900">{metrics.pendingToPlaceSunsky}</div>
                                </div>
                                <div className="bg-red-50 p-2 rounded border">
                                  <div className="font-semibold text-red-800">Breached</div>
                                  <div className="text-lg font-bold text-red-900">{metrics.breachOrders}</div>
                                </div>
                              </div>

                              {/* Detailed Metrics */}
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  Sunsky Shipped: {metrics.sunskyShipped}
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  Sunsky Processing: {metrics.sunskyProcessed}
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                  Noon Pending: {metrics.noonPending}
                                </span>
                              </div>
                              
                              {/* Multi-colored progress bar */}
                              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${metrics.sunskyShippedPercent}%` }}></div>
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${metrics.sunskyProcessedPercent}%` }}></div>
                                <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${metrics.pendingToPlaceSunskyPercent}%` }}></div>
                                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${metrics.breachOrdersPercent}%` }}></div>
                                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${metrics.noonPendingPercent}%` }}></div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {(viewMode === 'default' || expandedGroups.has(group.groupKey)) && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/5">
                          <button
                            className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                            onClick={() => handleSort('order_nr')}
                          >
                            Order & Product
                            {getSortIcon('order_nr')}
                          </button>
                        </TableHead>
                        <TableHead className="w-2/5">
                          <button
                            className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                            onClick={() => handleSort('title')}
                          >
                            Product Details
                            {getSortIcon('title')}
                          </button>
                        </TableHead>
                        <TableHead className="w-1/6">
                          <button
                            className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                            onClick={() => handleSort('order_received_at')}
                          >
                            Target & Time Remaining
                            {getSortIcon('order_received_at')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                            onClick={() => handleSort('quantity')}
                          >
                            Qty
                            {getSortIcon('quantity')}
                          </button>
                        </TableHead>
                        <TableHead className="w-1/4">
                          <button
                            className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                            onClick={() => handleSort('order_status')}
                          >
                            Order Status & Integration
                            {getSortIcon('order_status')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                            onClick={() => handleSort('order_country_code')}
                          >
                            Country
                            {getSortIcon('order_country_code')}
                          </button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.orders.map((order) => {
                    const orderReceivedDate = order.order_received_at ? new Date(order.order_received_at) : null;
                    const fulfillmentDate = order.fulfillment_timestamp ? new Date(order.fulfillment_timestamp) : null;
                    
                    const calculateTargetDate = () => {
                      if (!orderReceivedDate || !fulfillmentDate) return null;
                      
                      // Calculate expected processing time (fulfillment - received)
                      const processingTimeMs = fulfillmentDate.getTime() - orderReceivedDate.getTime();
                      
                      // If we have a target_ready_at, use it; otherwise calculate based on processing time
                      if (order.target_ready_at) {
                        return new Date(order.target_ready_at);
                      }
                      
                      // Default: add processing time to received date, or use standard 2-day processing
                      const standardProcessingTime = Math.max(processingTimeMs, 2 * 24 * 60 * 60 * 1000); // Minimum 2 days
                      return new Date(orderReceivedDate.getTime() + standardProcessingTime);
                    };
                    
                    const calculateTimeRemaining = () => {
                      const targetDate = calculateTargetDate();
                      if (!targetDate) {
                        if (!orderReceivedDate) return 'No receive date';
                        // Default 2-day processing if no fulfillment date
                        const defaultTarget = new Date(orderReceivedDate.getTime() + (2 * 24 * 60 * 60 * 1000));
                        const now = new Date();
                        const diffMs = defaultTarget.getTime() - now.getTime();
                        
                        if (diffMs < 0) {
                          const overdueDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                          return `${overdueDays}d overdue`;
                        }
                        
                        const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        
                        if (remainingDays > 0) {
                          return `${remainingDays}d ${remainingHours}h left`;
                        } else if (remainingHours > 0) {
                          return `${remainingHours}h left`;
                        } else {
                          const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          return `${remainingMinutes}m left`;
                        }
                      }
                      
                      const now = new Date();
                      const diffMs = targetDate.getTime() - now.getTime();
                      
                      if (diffMs < 0) {
                        const overdueDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                        const overdueHours = Math.abs(Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                        
                        if (overdueDays > 0) {
                          return `${overdueDays}d ${overdueHours}h overdue`;
                        } else {
                          return `${overdueHours}h overdue`;
                        }
                      }
                      
                      const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      
                      if (remainingDays > 0) {
                        return `${remainingDays}d ${remainingHours}h left`;
                      } else if (remainingHours > 0) {
                        return `${remainingHours}h left`;
                      } else {
                        const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        return `${remainingMinutes}m left`;
                      }
                    };

                    const getTimeRemainingColor = () => {
                      const timeRemaining = calculateTimeRemaining();
                      if (timeRemaining.includes('overdue')) return 'text-red-600 font-semibold';
                      if (timeRemaining.includes('h left') && !timeRemaining.includes('d')) {
                        // Less than 24 hours
                        const hours = parseInt(timeRemaining.match(/(\d+)h/)?.[1] || '0');
                        if (hours <= 6) return 'text-red-500 font-semibold';
                        if (hours <= 12) return 'text-yellow-600 font-medium';
                      }
                      if (timeRemaining.includes('m left')) return 'text-red-600 font-bold animate-pulse';
                      return 'text-green-600';
                    };

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {order.image_key && (
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://f.nooncdn.com/p/${order.image_key}.jpg`}
                                  alt={order.title || "Product image"}
                                  className="w-16 h-16 object-cover rounded border"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className="font-mono text-sm font-medium">
                                {order.order_nr}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {order.purchase_item_nr}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="font-medium text-sm truncate max-w-xs">
                              {order.title || 'N/A'}
                            </div>
                            <div className="flex flex-wrap gap-1 text-xs">
                              {order.partner_sku && (
                                <Badge variant="outline" className="text-xs">
                                  Partner: {order.partner_sku}
                                </Badge>
                              )}
                              {order.sku && (
                                <Badge variant="outline" className="text-xs">
                                  SKU: {order.sku}
                                </Badge>
                              )}
                              {order.brand_code && (
                                <Badge variant="outline" className="text-xs">
                                  Brand: {order.brand_code}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">Received:</span>
                              <br />
                              <span className="font-mono">
                                {orderReceivedDate ? orderReceivedDate.toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Target Date:</span>
                              <br />
                              <span className="font-mono">
                                {calculateTargetDate() ? calculateTargetDate()!.toLocaleDateString() : 'Calculating...'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time Left:</span>
                              <br />
                              <span className={`font-mono font-medium ${getTimeRemainingColor()}`}>
                                {calculateTimeRemaining()}
                              </span>
                            </div>
                            {fulfillmentDate && (
                              <div className="pt-1 border-t border-border/50">
                                <span className="text-muted-foreground">Fulfillment:</span>
                                <br />
                                <span className="font-mono text-xs">
                                  {fulfillmentDate.toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{order.quantity}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {/* Noon Order Status */}
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(order.order_status)}>
                                {order.order_status || 'Uploaded'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">Noon</span>
                            </div>
                            
                            {/* Sunsky Integration Status */}
                            {order.sunsky_order_number ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {order.sunsky_order_number}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Sunsky</span>
                                </div>
                                
                                {/* Sunsky Order Status */}
                                {order.sunsky_order_status && (
                                  <div className="flex items-center gap-1">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        order.sunsky_order_status === 1 ? 'bg-yellow-100 text-yellow-800' :
                                        order.sunsky_order_status === 2 ? 'bg-blue-100 text-blue-800' :
                                        order.sunsky_order_status === 3 ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {order.sunsky_order_status === 1 ? 'Pending' :
                                       order.sunsky_order_status === 2 ? 'Processing' :
                                       order.sunsky_order_status === 3 ? 'Shipped' :
                                       `Status ${order.sunsky_order_status}`}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">Status</span>
                                  </div>
                                )}
                                
                                {/* Sunsky Tracking Number */}
                                {order.sunsky_tracking_number && (
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 font-mono">
                                      {order.sunsky_tracking_number}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">Track</span>
                                  </div>
                                )}
                              </div>
                            ) : order.partner_sku ? (
                              <div className="text-xs text-muted-foreground">
                                Ready for Sunsky
                              </div>
                            ) : (
                              <div className="text-xs text-amber-600">
                                Missing Partner SKU
                              </div>
                            )}
                            
                            {/* Error Messages */}
                            {order.sunsky_error_message && (
                              <div className="flex items-center gap-1">
                                <Badge variant="destructive" className="text-xs">
                                  Error
                                </Badge>
                                <span className="text-xs text-red-600 truncate max-w-32" title={order.sunsky_error_message}>
                                  {order.sunsky_error_message}
                                </span>
                              </div>
                            )}
                            
                            {/* Last Sync Time */}
                            {order.sunsky_last_sync && (
                              <div className="text-xs text-muted-foreground">
                                Synced: {new Date(order.sunsky_last_sync).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.order_country_code}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
                  )}
            </div>
              ))}
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