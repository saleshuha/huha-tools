import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { 
  AlertTriangle, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  Calendar, Package, ExternalLink
} from 'lucide-react';
import { useSunskyOrders } from '@/hooks/useSunskyOrders';

interface DelayedItemsTabProps {
  onTrackingClick?: (url: string) => void;
  formatDate: (dateString: string | null) => string;
  getStatusBadge: (status: string | number, isDelayed?: boolean) => JSX.Element;
}

type SortField = 'order_number' | 'title' | 'item_status' | 'days_in_status' | 'sku_code';
type SortDirection = 'asc' | 'desc';

export function DelayedItemsTab({ 
  onTrackingClick, 
  formatDate, 
  getStatusBadge 
}: DelayedItemsTabProps) {
  const navigate = useNavigate();
  const { getSlowItems } = useSunskyOrders();
  const [slowItems, setSlowItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('days_in_status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch delayed items
  useEffect(() => {
    const fetchDelayedItems = async () => {
      setLoading(true);
      try {
        const items = await getSlowItems(3);
        setSlowItems(items);
      } catch (error) {
        console.error('Failed to fetch delayed items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDelayedItems();
  }, []); // Remove getSlowItems dependency to prevent infinite loop

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(slowItems.map(item => item.item_status).filter(Boolean))];
    return statuses.sort();
  }, [slowItems]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = slowItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.item_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort items
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special cases
      if (sortField === 'days_in_status') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [slowItems, searchTerm, statusFilter, sortField, sortDirection]);

  // Paginate items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const items = await getSlowItems(3);
      setSlowItems(items);
    } catch (error) {
      console.error('Failed to refresh delayed items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading delayed items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-warning" />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Delayed Items</h2>
            <p className="text-muted-foreground">Items delayed for 3+ days in current status</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Total Delayed</p>
                <p className="text-2xl font-semibold">{slowItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Filtered Results</p>
                <p className="text-2xl font-semibold">{filteredAndSortedItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Days Delayed</p>
                <p className="text-2xl font-semibold">
                  {slowItems.length > 0 
                    ? Math.round(slowItems.reduce((sum, item) => sum + (item.days_in_status || 0), 0) / slowItems.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, title, or SKU..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Table */}
      {filteredAndSortedItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No delayed items found</h3>
            <p className="text-muted-foreground">
              {slowItems.length === 0 
                ? "Great! No items are currently delayed."
                : "No items match your current search criteria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('order_number')}
                        className="font-medium"
                      >
                        Order Number {getSortIcon('order_number')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('title')}
                        className="font-medium"
                      >
                        Item Details {getSortIcon('title')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('item_status')}
                        className="font-medium"
                      >
                        Status {getSortIcon('item_status')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('days_in_status')}
                        className="font-medium"
                      >
                        Days Delayed {getSortIcon('days_in_status')}
                      </Button>
                    </TableHead>
                    <TableHead>Last Status Update</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-primary">
                          {item.order_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">
                            {item.title || item.sku_code}
                          </div>
                          {item.sku_code && item.title && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku_code}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.item_status || 'unknown', true)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <span className="font-medium text-warning">
                            {item.days_in_status} days
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(item as any).status_last_updated_at || (item as any).last_updated 
                          ? formatDate((item as any).status_last_updated_at || (item as any).last_updated) 
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(item as any).tracking_url && onTrackingClick && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onTrackingClick((item as any).tracking_url)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/sunsky-order-details/${item.order_number}`)}
                          >
                            View Order
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={pageNum === currentPage}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}