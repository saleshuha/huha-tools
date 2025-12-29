import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Package, 
  Target, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

interface OrderItem {
  orderId: string;
  asin?: string;
  sku?: string;
  itemTitle?: string;
  itemQuantity: number;
  orderStatus?: string;
  orderPlaceDate?: string;
  isMatched?: boolean;
  isProcessed?: boolean;
  matchType?: string;
  inventoryType?: string;
  availableStock?: number;
}

interface UnifiedOrderTableProps {
  orders: OrderItem[];
  activeTab: 'all' | 'matched' | 'unmatched' | 'processed';
  onTabChange: (tab: 'all' | 'matched' | 'unmatched' | 'processed') => void;
  selectedOrders?: Set<string>;
  onSelectOrder?: (orderId: string) => void;
  onSelectAll?: () => void;
  showSelection?: boolean;
  isLoading?: boolean;
  renderProductImage?: (asin: string) => React.ReactNode;
}

export function UnifiedOrderTable({
  orders,
  activeTab,
  onTabChange,
  selectedOrders = new Set(),
  onSelectOrder,
  onSelectAll,
  showSelection = false,
  isLoading = false,
  renderProductImage
}: UnifiedOrderTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Filter orders based on tab and search
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply tab filter
    switch (activeTab) {
      case 'matched':
        filtered = orders.filter(o => o.isMatched && !o.isProcessed);
        break;
      case 'unmatched':
        filtered = orders.filter(o => !o.isMatched);
        break;
      case 'processed':
        filtered = orders.filter(o => o.isProcessed);
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderId.toLowerCase().includes(search) ||
        order.asin?.toLowerCase().includes(search) ||
        order.sku?.toLowerCase().includes(search) ||
        order.itemTitle?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [orders, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabCounts = useMemo(() => ({
    all: orders.length,
    matched: orders.filter(o => o.isMatched && !o.isProcessed).length,
    unmatched: orders.filter(o => !o.isMatched).length,
    processed: orders.filter(o => o.isProcessed).length
  }), [orders]);

  const allSelected = paginatedOrders.length > 0 && 
    paginatedOrders.every(o => selectedOrders.has(o.orderId));

  return (
    <Card className="overflow-hidden border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-muted/30 via-card to-muted/30">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Tab Pills */}
          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as typeof activeTab)}>
            <TabsList className="h-10 bg-background/80 p-1">
              <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Package className="w-4 h-4" />
                All
                <Badge variant="secondary" className="ml-1 text-xs">{tabCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="matched" className="gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                <Target className="w-4 h-4" />
                Matched
                <Badge variant="secondary" className="ml-1 text-xs">{tabCounts.matched}</Badge>
              </TabsTrigger>
              <TabsTrigger value="unmatched" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <AlertTriangle className="w-4 h-4" />
                Unmatched
                <Badge variant="secondary" className="ml-1 text-xs">{tabCounts.unmatched}</Badge>
              </TabsTrigger>
              <TabsTrigger value="processed" className="gap-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
                <CheckCircle2 className="w-4 h-4" />
                Processed
                <Badge variant="secondary" className="ml-1 text-xs">{tabCounts.processed}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order ID, ASIN, SKU, or Title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-background/80 border-border/50"
            />
          </div>

          {/* Items per page */}
          <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {paginatedOrders.length} of {filteredOrders.length} orders
            {searchTerm && ` matching "${searchTerm}"`}
          </span>
          {showSelection && selectedOrders.size > 0 && (
            <Badge variant="default" className="bg-primary/20 text-primary">
              {selectedOrders.size} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              {showSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                    className="border-2"
                  />
                </TableHead>
              )}
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead className="min-w-[280px]">Product</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              {activeTab === 'matched' && <TableHead>Stock</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  {showSelection && <TableCell><div className="w-4 h-4 bg-muted rounded" /></TableCell>}
                  <TableCell><div className="w-16 h-16 bg-muted rounded-lg" /></TableCell>
                  <TableCell><div className="w-24 h-4 bg-muted rounded" /></TableCell>
                  <TableCell><div className="w-48 h-4 bg-muted rounded" /></TableCell>
                  <TableCell><div className="w-8 h-4 bg-muted rounded mx-auto" /></TableCell>
                  <TableCell><div className="w-16 h-6 bg-muted rounded-full" /></TableCell>
                  <TableCell><div className="w-20 h-4 bg-muted rounded" /></TableCell>
                </TableRow>
              ))
            ) : paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={showSelection ? 8 : 7} 
                  className="py-12 text-center text-muted-foreground"
                >
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No orders found</p>
                  <p className="text-sm">
                    {searchTerm ? 'Try a different search term' : 'Upload orders to get started'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order, index) => {
                const isSelected = selectedOrders.has(order.orderId);
                
                return (
                  <TableRow
                    key={order.orderId}
                    onClick={() => showSelection && onSelectOrder?.(order.orderId)}
                    className={`
                      ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                      ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''}
                      ${showSelection ? 'cursor-pointer' : ''}
                      hover:bg-muted/30 transition-colors
                    `}
                  >
                    {showSelection && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onSelectOrder?.(order.orderId)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {renderProductImage ? (
                        renderProductImage(order.asin || '')
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <p className="font-medium text-sm truncate max-w-[280px]">
                          {order.itemTitle || 'Untitled'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {order.asin && (
                            <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 border-sky-500/20">
                              ASIN: {order.asin}
                            </Badge>
                          )}
                          {order.sku && (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              SKU: {order.sku}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{order.itemQuantity}</Badge>
                    </TableCell>
                    <TableCell>
                      {order.isProcessed ? (
                        <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20">Processed</Badge>
                      ) : order.isMatched ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Matched</Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Unmatched</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.orderPlaceDate 
                        ? new Date(order.orderPlaceDate).toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                    {activeTab === 'matched' && (
                      <TableCell>
                        <Badge 
                          variant={order.availableStock && order.availableStock >= order.itemQuantity ? 'default' : 'destructive'}
                          className={order.availableStock && order.availableStock >= order.itemQuantity 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : ''}
                        >
                          {order.availableStock ?? 0}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border/50 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
