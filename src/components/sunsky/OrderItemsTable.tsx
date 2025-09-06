import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Download, Search, Filter, Package, Clock, 
  SortAsc, SortDesc, Grid, List 
} from 'lucide-react';
import { ItemStatusBadge } from './ItemStatusBadge';
import { SegmentedProgress } from './SegmentedProgress';
import { calculateOrderProgress } from '@/utils/sunsky-progress';
import { exportToCSV, generateTimestampedFilename, formatDateForCSV, formatCurrencyForCSV } from '@/utils/csv';

interface OrderItem {
  id?: string;
  sku_code?: string;
  title?: string;
  quantity?: number;
  unit_price?: number;
  currency?: string;
  item_status?: string | number;
  model_number?: string;
  asin?: string;
  created_at?: string;
  status_last_updated_at?: string;
  expected_ship_date?: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  orderNumber: string;
  loading?: boolean;
  className?: string;
}

type SortField = 'title' | 'status' | 'quantity' | 'price' | 'daysInStatus';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

export function OrderItemsTable({ 
  items = [], 
  orderNumber,
  loading = false,
  className = ''
}: OrderItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [groupByStatus, setGroupByStatus] = useState(false);

  // Calculate days in status for each item
  const itemsWithMetadata = useMemo(() => {
    return items.map(item => {
      const statusDate = item.status_last_updated_at || item.created_at;
      const daysInStatus = statusDate 
        ? Math.floor((Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      const isDelayed = daysInStatus > 3 && 
        item.item_status !== 'shipped' && 
        item.item_status !== 'delivered' &&
        item.item_status !== '5' &&
        item.item_status !== '6';

      const progress = calculateOrderProgress(item.item_status || 'pending');

      return {
        ...item,
        daysInStatus,
        isDelayed,
        progress
      };
    });
  }, [items]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = itemsWithMetadata.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm || 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.asin?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const itemStatus = String(item.item_status || 'pending').toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
        itemStatus === statusFilter ||
        (statusFilter === 'delayed' && item.isDelayed);

      return matchesSearch && matchesStatus;
    });

    // Sort items
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title || a.sku_code || '';
          bValue = b.title || b.sku_code || '';
          break;
        case 'status':
          aValue = a.progress.currentStep;
          bValue = b.progress.currentStep;
          break;
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case 'price':
          aValue = a.unit_price || 0;
          bValue = b.unit_price || 0;
          break;
        case 'daysInStatus':
          aValue = a.daysInStatus;
          bValue = b.daysInStatus;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [itemsWithMetadata, searchTerm, statusFilter, sortField, sortDirection]);

  // Group items by status if enabled
  const groupedItems = useMemo(() => {
    if (!groupByStatus) return { 'All Items': filteredAndSortedItems };

    const groups: Record<string, typeof filteredAndSortedItems> = {};
    
    filteredAndSortedItems.forEach(item => {
      const statusLabel = item.progress.statusLabel;
      if (!groups[statusLabel]) {
        groups[statusLabel] = [];
      }
      groups[statusLabel].push(item);
    });

    return groups;
  }, [filteredAndSortedItems, groupByStatus]);

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(itemsWithMetadata.map(item => 
      String(item.item_status || 'pending').toLowerCase()
    ));
    return Array.from(statuses);
  }, [itemsWithMetadata]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  const handleExportCSV = () => {
    const headers = [
      'sku_code',
      'title', 
      'quantity',
      'unit_price',
      'currency',
      'item_status',
      'days_in_status',
      'expected_ship_date',
      'model_number',
      'asin',
      'created_at',
      'status_last_updated_at'
    ];

    const exportData = filteredAndSortedItems.map(item => ({
      sku_code: item.sku_code || '',
      title: item.title || '',
      quantity: item.quantity || 0,
      unit_price: formatCurrencyForCSV(item.unit_price || 0, item.currency),
      currency: item.currency || 'USD',
      item_status: item.progress.statusLabel,
      days_in_status: item.daysInStatus,
      expected_ship_date: formatDateForCSV(item.expected_ship_date),
      model_number: item.model_number || '',
      asin: item.asin || '',
      created_at: formatDateForCSV(item.created_at),
      status_last_updated_at: formatDateForCSV(item.status_last_updated_at)
    }));

    const filename = generateTimestampedFilename(`sunsky_order_${orderNumber}_items`);
    exportToCSV(exportData, headers, filename);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const delayedCount = filteredAndSortedItems.filter(item => item.isDelayed).length;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading items...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items ({filteredAndSortedItems.length})
            {delayedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {delayedCount} delayed
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            >
              {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredAndSortedItems.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, SKU, model, or ASIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="delayed">Delayed Items</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <Button
            variant={groupByStatus ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupByStatus(!groupByStatus)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Group by Status
          </Button>
        </div>

        {/* Items Display */}
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No items found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
              <div key={groupName}>
                {groupByStatus && (
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {groupName}
                    <Badge variant="outline">{groupItems.length}</Badge>
                  </h3>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('title')}
                            className="flex items-center gap-2"
                          >
                            Title/SKU
                            {getSortIcon('title')}
                          </Button>
                        </th>
                        <th className="text-left p-3 font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('status')}
                            className="flex items-center gap-2"
                          >
                            Status
                            {getSortIcon('status')}
                          </Button>
                        </th>
                        <th className="text-left p-3 font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('quantity')}
                            className="flex items-center gap-2"
                          >
                            Qty
                            {getSortIcon('quantity')}
                          </Button>
                        </th>
                        <th className="text-left p-3 font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('price')}
                            className="flex items-center gap-2"
                          >
                            Price
                            {getSortIcon('price')}
                          </Button>
                        </th>
                        <th className="text-left p-3 font-semibold">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('daysInStatus')}
                            className="flex items-center gap-2"
                          >
                            Days in Status
                            {getSortIcon('daysInStatus')}
                          </Button>
                        </th>
                        <th className="text-left p-3 font-semibold">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupItems.map((item, index) => (
                        <tr 
                          key={item.id || index}
                          className={`border-b border-border hover:bg-muted/50 transition-colors ${
                            item.isDelayed ? 'bg-warning/5' : ''
                          }`}
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {item.title || item.sku_code || 'Unknown Item'}
                              </div>
                              {item.sku_code && item.title && (
                                <div className="text-sm text-muted-foreground font-mono">
                                  SKU: {item.sku_code}
                                </div>
                              )}
                              {item.asin && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  ASIN: {item.asin}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <ItemStatusBadge 
                              status={item.item_status || 'pending'}
                              isDelayed={item.isDelayed}
                              daysInStatus={item.daysInStatus}
                              size="sm"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{item.quantity || 1}</span>
                          </td>
                          <td className="p-3">
                            {item.unit_price ? (
                              <span className="font-medium">
                                {formatCurrency(item.unit_price, item.currency)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className={item.isDelayed ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                                {item.daysInStatus}d
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <SegmentedProgress
                              currentStep={item.progress.currentStep}
                              totalSteps={item.progress.totalSteps}
                              percentage={item.progress.percentage}
                              statusLabel={item.progress.statusLabel}
                              statusColor={item.progress.statusColor}
                              showLabels={false}
                              size="sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Grid view
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
              <div key={groupName}>
                {groupByStatus && (
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {groupName}
                    <Badge variant="outline">{groupItems.length}</Badge>
                  </h3>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupItems.map((item, index) => (
                    <Card 
                      key={item.id || index}
                      className={`transition-all duration-200 hover:shadow-medium ${
                        item.isDelayed ? 'ring-2 ring-warning/20 bg-warning/5' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold line-clamp-2">
                              {item.title || item.sku_code || 'Unknown Item'}
                            </h4>
                            {item.sku_code && item.title && (
                              <p className="text-sm text-muted-foreground font-mono">
                                SKU: {item.sku_code}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <ItemStatusBadge 
                              status={item.item_status || 'pending'}
                              isDelayed={item.isDelayed}
                              daysInStatus={item.daysInStatus}
                              size="sm"
                            />
                            <div className="text-right">
                              <div className="text-sm font-medium">Qty: {item.quantity || 1}</div>
                              {item.unit_price && (
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(item.unit_price, item.currency)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <SegmentedProgress
                            currentStep={item.progress.currentStep}
                            totalSteps={item.progress.totalSteps}
                            percentage={item.progress.percentage}
                            statusLabel={item.progress.statusLabel}
                            statusColor={item.progress.statusColor}
                            showLabels={false}
                            size="sm"
                          />
                          
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Days in status: {item.daysInStatus}</span>
                            {item.isDelayed && (
                              <Badge variant="destructive" className="text-xs">
                                Delayed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderItemsTable;