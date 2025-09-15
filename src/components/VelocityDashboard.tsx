import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from './ui/pagination';
import { useVelocityAnalytics } from '@/hooks/useVelocityAnalytics';
import { useEnhancedStockAnalytics, InventoryItemAnalysis, StockLifecycleEvent } from '@/hooks/useEnhancedStockAnalytics';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Zap, Activity, History, Package, ShoppingCart, Truck, Award, Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Separator } from './ui/separator';
import { format, formatDistanceToNow } from 'date-fns';

export function VelocityDashboard() {
  const { velocityItems, velocityMetrics, loading, getUrgencyColor, getVelocityColor } = useVelocityAnalytics();
  const { asinAnalytics, skuAnalytics, loading: enhancedLoading, loadItemAnalysis } = useEnhancedStockAnalytics();
  const [selectedItem, setSelectedItem] = useState<InventoryItemAnalysis | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('urgency');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleProductClick = async (itemId: string, inventoryType: 'asin' | 'sku') => {
    console.log('Row clicked - itemId:', itemId, 'inventoryType:', inventoryType);
    try {
      const analysis = await loadItemAnalysis(itemId, inventoryType);
      console.log('Analysis result:', analysis);
      if (analysis) {
        setSelectedItem(analysis);
        setShowDetails(true);
        console.log('Details panel should now be visible');
      } else {
        console.log('No analysis data received');
      }
    } catch (error) {
      console.error('Error loading item analysis:', error);
    }
  };

  // Combine velocity items with enhanced analytics data - ASIN only
  const allInventoryItems = useMemo(() => {
    const velocityWithType = velocityItems
      .filter(item => item.table_name.includes('asin')) // Only ASIN items
      .map(item => ({
        ...item,
        type: 'ASIN',
        enhanced_data: asinAnalytics.find(a => a.id === item.item_id)
      }));
    return velocityWithType;
  }, [velocityItems, asinAnalytics]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = allInventoryItems.filter(item => {
      const matchesSearch = item.identifier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.velocity_category === selectedCategory;
      // No type filtering needed since we only have ASIN items
      return matchesSearch && matchesCategory;
    });

    // Sort items
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'urgency':
          aValue = a.urgency_score;
          bValue = b.urgency_score;
          break;
        case 'velocity':
          aValue = a.sales_velocity;
          bValue = b.sales_velocity;
          break;
        case 'stock':
          aValue = a.current_quantity;
          bValue = b.current_quantity;
          break;
        case 'identifier':
          aValue = a.identifier;
          bValue = b.identifier;
          break;
        default:
          aValue = a.urgency_score;
          bValue = b.urgency_score;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [allInventoryItems, searchTerm, selectedCategory, sortBy, sortOrder]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('urgency');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, sortBy, sortOrder]);

  const renderLifecycleTimeline = (events: StockLifecycleEvent[]) => {
    return (
      <div className="space-y-3">
        {events.map((event, index) => {
          const isPositive = event.quantity_change > 0;
          const isNeutral = event.quantity_change === 0;
          
          return (
            <Card key={event.id} className="relative">
              <CardContent className="p-4">
                {index < events.length - 1 && (
                  <div className="absolute left-6 top-12 w-px h-8 bg-border" />
                )}
                
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    event.event_type === 'addition' ? 'bg-blue-100 text-blue-600' :
                    event.event_type === 'sale' ? 'bg-red-100 text-red-600' :
                    event.event_type === 'order_placed' ? 'bg-orange-100 text-orange-600' :
                    event.event_type === 'restock' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {event.event_type === 'addition' && <Package className="w-4 h-4" />}
                    {event.event_type === 'sale' && <TrendingDown className="w-4 h-4" />}
                    {event.event_type === 'order_placed' && <ShoppingCart className="w-4 h-4" />}
                    {event.event_type === 'restock' && <Truck className="w-4 h-4" />}
                    {event.event_type === 'adjustment' && <Activity className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium capitalize">
                          {event.event_type.replace('_', ' ')}
                        </h4>
                        <Badge variant={isPositive ? 'default' : isNeutral ? 'secondary' : 'destructive'}>
                          {isPositive ? '+' : ''}{event.quantity_change}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Before:</span>
                        <div className="font-medium">{event.quantity_before}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">After:</span>
                        <div className="font-medium">{event.quantity_after}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Days from previous:</span>
                        <div className="font-medium">
                          {event.days_from_previous !== null ? `${event.days_from_previous}d` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {event.event_details.reason && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {event.event_details.reason}
                      </div>
                    )}
                    
                    {event.event_details.po_number && (
                      <div className="mt-2">
                        <Badge variant="outline">PO: {event.event_details.po_number}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMetricsCards = (analysis: InventoryItemAnalysis) => {
    const { metrics } = analysis;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Performance Grade</span>
              <Award className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className={`text-2xl font-bold ${
              metrics.performance_grade === 'A' ? 'text-green-600' :
              metrics.performance_grade === 'B' ? 'text-blue-600' :
              metrics.performance_grade === 'C' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {metrics.performance_grade}
            </div>
            <Badge variant="outline" className="mt-2">
              {metrics.velocity_category}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Sales Velocity</span>
              <Zap className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.sales_velocity.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">items/day</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Days to First Sale</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.avg_days_to_first_sale}
            </div>
            <div className="text-xs text-muted-foreground mt-1">days</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Order → Restock</span>
              <Truck className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.avg_days_from_order_to_restock}
            </div>
            <div className="text-xs text-muted-foreground mt-1">days average</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Recommended Order</span>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.recommended_order_quantity}
            </div>
            <div className="text-xs text-muted-foreground mt-1">units</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Stock Status</span>
              {analysis.current_quantity <= metrics.recommended_reorder_point ? 
                <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                <Activity className="w-4 h-4 text-green-500" />
              }
            </div>
            <div className="text-2xl font-bold">
              {analysis.current_quantity}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Reorder at {metrics.recommended_reorder_point}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading || enhancedLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Controls Skeleton */}
        <div className="flex flex-wrap gap-4 animate-pulse">
          <div className="h-10 bg-muted rounded w-64"></div>
          <div className="h-10 bg-muted rounded w-32"></div>
          <div className="h-10 bg-muted rounded w-32"></div>
          <div className="h-10 bg-muted rounded w-32"></div>
        </div>
        
        {/* Table Skeleton */}
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Clickable to filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${selectedCategory === 'Fast Moving' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedCategory(selectedCategory === 'Fast Moving' ? 'all' : 'Fast Moving')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fast Moving</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{velocityMetrics.fastMovingItems}</div>
            <p className="text-xs text-muted-foreground">High velocity items</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${selectedCategory === 'Medium Moving' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedCategory(selectedCategory === 'Medium Moving' ? 'all' : 'Medium Moving')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Moving</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{velocityMetrics.mediumMovingItems}</div>
            <p className="text-xs text-muted-foreground">Moderate velocity items</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${selectedCategory === 'Slow Moving' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedCategory(selectedCategory === 'Slow Moving' ? 'all' : 'Slow Moving')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Moving</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{velocityMetrics.slowMovingItems}</div>
            <p className="text-xs text-muted-foreground">Low velocity items</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${selectedCategory === 'No Sales' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedCategory(selectedCategory === 'No Sales' ? 'all' : 'No Sales')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Sales</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{velocityMetrics.noSalesItems}</div>
            <p className="text-xs text-muted-foreground">Items with no sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Fast Moving">Fast Moving</SelectItem>
                <SelectItem value="Medium Moving">Medium Moving</SelectItem>
                <SelectItem value="Slow Moving">Slow Moving</SelectItem>
                <SelectItem value="No Sales">No Sales</SelectItem>
              </SelectContent>
            </Select>


            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgency">Urgency</SelectItem>
                <SelectItem value="velocity">Velocity</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="identifier">Name</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedItems.length)}-{Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
                {filteredAndSortedItems.length !== allInventoryItems.length && ` (filtered from ${allInventoryItems.length})`}
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span>Avg Velocity: {velocityMetrics.avgVelocity.toFixed(3)}/day</span>
              <span>Urgent: {velocityMetrics.totalUrgentItems}</span>
              <span>Critical: {velocityMetrics.criticalItems.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unified Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            ASIN Inventory Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedInventoryTable 
            items={paginatedItems}
            getUrgencyColor={getUrgencyColor}
            onProductClick={handleProductClick}
          />
          
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNumber);
                          }}
                          isActive={currentPage === pageNumber}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(totalPages);
                          }}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Details Panel */}
      {selectedItem && showDetails && (
        <Card>
          <CardHeader className="cursor-pointer hover:bg-muted/50" onClick={() => setShowDetails(false)}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Product Details: {selectedItem.identifier}
              </CardTitle>
              <X className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedItem.identifier}</h3>
                  <p className="text-sm text-muted-foreground">
                    Added {formatDistanceToNow(new Date(selectedItem.date_added), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>

              {renderMetricsCards(selectedItem)}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Lifecycle Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderLifecycleTimeline(selectedItem.lifecycle_events)}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface UnifiedInventoryTableProps {
  items: any[];
  getUrgencyColor: (score: number) => "default" | "destructive" | "secondary" | "outline";
  onProductClick?: (itemId: string, inventoryType: 'asin' | 'sku') => void;
}

function UnifiedInventoryTable({ items, getUrgencyColor, onProductClick }: UnifiedInventoryTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">No items match your current filters</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your search criteria or filters
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Velocity</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Recommended Order</TableHead>
            <TableHead>Stock Days</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.item_id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onProductClick?.(item.item_id, item.table_name.includes('asin') ? 'asin' : 'sku')}
            >
              <TableCell>
                <div className="font-medium">{item.identifier}</div>
                {item.enhanced_data && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Added {formatDistanceToNow(new Date(item.enhanced_data.date_added), { addSuffix: true })}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={item.type === 'ASIN' ? 'default' : 'secondary'}>
                  {item.type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="font-medium">{item.current_quantity}</div>
                {item.enhanced_data && item.current_quantity <= item.enhanced_data.metrics.recommended_reorder_point && (
                  <div className="text-xs text-orange-600 mt-1">Below reorder point</div>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium">{item.sales_velocity.toFixed(3)}/day</div>
                {item.enhanced_data && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg to first sale: {item.enhanced_data.metrics.avg_days_to_first_sale}d
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.velocity_category}</Badge>
              </TableCell>
              <TableCell>
                <div className="font-bold text-green-600">
                  {item.recommended_reorder_quantity}
                </div>
                {item.enhanced_data && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Reorder at: {item.enhanced_data.metrics.recommended_reorder_point}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {item.stock_days_remaining ? `${item.stock_days_remaining.toFixed(1)}d` : 'N/A'}
                </div>
                {item.enhanced_data && item.enhanced_data.metrics.predicted_stockout_date && (
                  <div className="text-xs text-orange-600 mt-1">
                    Expected stockout: {format(new Date(item.enhanced_data.metrics.predicted_stockout_date), 'MMM dd')}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={getUrgencyColor(item.urgency_score)}>
                  {item.urgency_score}
                </Badge>
              </TableCell>
              <TableCell>
                {item.enhanced_data ? (
                  <Badge variant={
                    item.enhanced_data.metrics.performance_grade === 'A' ? 'default' :
                    item.enhanced_data.metrics.performance_grade === 'B' ? 'secondary' :
                    item.enhanced_data.metrics.performance_grade === 'C' ? 'outline' : 'destructive'
                  }>
                    Grade {item.enhanced_data.metrics.performance_grade}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">N/A</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle order action
                    }}
                  >
                    Order {item.recommended_reorder_quantity}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}