import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Activity,
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  Clock,
  Database,
  Gauge,
  Package,
  ShoppingCart,
  Star,
  Target,
  Truck,
  X,
  Columns3,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AllInventoryItem {
  id: string;
  item_type: 'ASIN' | 'SKU';
  asin?: string;
  sku?: string;
  serial_number?: string;
  quantity: number;
  status: string;
  last_sold_date?: string;
  last_order_date?: string;
  days_since_ordered?: number;
}

interface InventoryMetrics {
  velocityScore: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  stockDaysRemaining: number | null;
  turnoverRate: number;
  performanceRating: number;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  resizable: boolean;
  icon: any;
}

interface ReplenishmentTableProps {
  items: AllInventoryItem[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  sortConfig: {key: keyof AllInventoryItem | null, direction: 'asc' | 'desc'};
  filters: any;
  headerFilters: any;
  onSort: (key: keyof AllInventoryItem) => void;
  onUpdateHeaderFilter: (field: string, value: string) => void;
  onUpdateHeaderRangeFilter: (field: string, type: 'min' | 'max', value: string) => void;
  onClearHeaderFilters: () => void;
  calculateItemMetrics: (item: AllInventoryItem) => InventoryMetrics;
}

export function ReplenishmentTable({
  items,
  loading,
  currentPage,
  itemsPerPage,
  sortConfig,
  filters,
  headerFilters,
  onSort,
  onUpdateHeaderFilter,
  onUpdateHeaderRangeFilter,
  onClearHeaderFilters,
  calculateItemMetrics
}: ReplenishmentTableProps) {
  // Column configuration state
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { key: 'item_type', label: 'Type', visible: true, width: 120, minWidth: 80, resizable: true, icon: Database },
    { key: 'asin', label: 'ASIN', visible: true, width: 150, minWidth: 100, resizable: true, icon: Package },
    { key: 'sku', label: 'SKU', visible: true, width: 150, minWidth: 100, resizable: true, icon: ShoppingCart },
    { key: 'serial_number', label: 'Serial Number', visible: true, width: 140, minWidth: 100, resizable: true, icon: Target },
    { key: 'quantity', label: 'Quantity', visible: true, width: 120, minWidth: 80, resizable: true, icon: Gauge },
    { key: 'status', label: 'Status', visible: true, width: 120, minWidth: 80, resizable: true, icon: Activity },
    { key: 'last_sold_date', label: 'Last Sold', visible: true, width: 140, minWidth: 100, resizable: true, icon: Clock },
    { key: 'last_order_date', label: 'Last Order', visible: true, width: 140, minWidth: 100, resizable: true, icon: Truck },
    { key: 'days_since_ordered', label: 'Days Since', visible: true, width: 120, minWidth: 80, resizable: true, icon: CalendarIcon },
    { key: 'metrics', label: 'Metrics', visible: true, width: 160, minWidth: 120, resizable: true, icon: Star }
  ]);

  // Column resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeColumnKey, setResizeColumnKey] = useState<string | null>(null);

  // Column management functions
  const toggleColumnVisibility = (columnKey: string) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const updateColumnWidth = (columnKey: string, newWidth: number) => {
    setColumnConfig(prev =>
      prev.map(col =>
        col.key === columnKey 
          ? { ...col, width: Math.max(newWidth, col.minWidth) }
          : col
      )
    );
  };

  const resetColumnWidths = () => {
    setColumnConfig(prev =>
      prev.map(col => ({
        ...col,
        width: col.key === 'item_type' ? 120 :
               col.key === 'asin' || col.key === 'sku' ? 150 :
               col.key === 'serial_number' || col.key === 'last_sold_date' || col.key === 'last_order_date' ? 140 :
               col.key === 'quantity' || col.key === 'status' || col.key === 'days_since_ordered' ? 120 :
               160
      }))
    );
  };

  const showAllColumns = () => {
    setColumnConfig(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const hideAllColumns = () => {
    // Keep at least one column visible
    setColumnConfig(prev => 
      prev.map((col, index) => ({ 
        ...col, 
        visible: index === 0 // Keep first column (Type) visible
      }))
    );
  };

  const visibleColumns = columnConfig.filter(col => col.visible);

  // Calculate current items for pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

  const renderCellContent = (column: ColumnConfig, item: AllInventoryItem) => {
    const metrics = calculateItemMetrics(item);
    
    switch (column.key) {
      case 'item_type':
        return (
          <Badge 
            variant={item.item_type === 'ASIN' ? 'default' : 'secondary'}
            className="font-medium"
          >
            {item.item_type}
          </Badge>
        );
      case 'asin':
        return <span className="font-mono text-sm font-medium">{item.asin || 'N/A'}</span>;
      case 'sku':
        return <span className="font-mono text-sm font-medium">{item.sku || 'N/A'}</span>;
      case 'serial_number':
        return <span className="font-mono text-sm">{item.serial_number || 'N/A'}</span>;
      case 'quantity':
        return (
          <div className="flex items-center gap-2">
            <Badge 
              variant={item.quantity === 0 ? 'destructive' : item.quantity <= 2 ? 'secondary' : 'default'}
              className={cn(
                "font-bold transition-colors",
                item.quantity === 0 ? 'bg-destructive/20 text-destructive border-destructive/50' : 
                item.quantity <= 2 ? 'bg-warning/20 text-warning border-warning/50' : 
                'bg-success/20 text-success border-success/50'
              )}
            >
              {item.quantity}
            </Badge>
            {item.quantity <= 5 && (
              <Progress 
                value={Math.min((item.quantity / 10) * 100, 100)} 
                className="w-12 h-2"
              />
            )}
          </div>
        );
      case 'status':
        return (
          <Badge 
            variant={item.status === 'in-stock' ? 'default' : 'secondary'}
            className={cn(
              "capitalize",
              item.status === 'in-stock' ? 'bg-success/20 text-success border-success/50' : 
              item.status === 'ordered' ? 'bg-primary/20 text-primary border-primary/50' :
              'bg-muted/50 text-muted-foreground'
            )}
          >
            {item.status}
          </Badge>
        );
      case 'last_sold_date':
        return (
          <span className="text-sm text-muted-foreground">
            {item.last_sold_date ? format(new Date(item.last_sold_date), 'MMM dd, yyyy') : 'Never'}
          </span>
        );
      case 'last_order_date':
        return (
          <span className="text-sm text-muted-foreground">
            {item.last_order_date ? format(new Date(item.last_order_date), 'MMM dd, yyyy') : 'Never'}
          </span>
        );
      case 'days_since_ordered':
        return (
          <span className="text-sm font-medium">
            {item.days_since_ordered !== null ? `${item.days_since_ordered} days` : 'N/A'}
          </span>
        );
      case 'metrics':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge 
                variant={metrics.urgencyLevel === 'critical' ? 'destructive' : metrics.urgencyLevel === 'high' ? 'secondary' : 'default'}
                className="text-xs"
              >
                {metrics.urgencyLevel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Score: {Math.round(metrics.velocityScore)}
              </span>
            </div>
            {metrics.stockDaysRemaining && (
              <div className="text-xs text-muted-foreground">
                <Clock className="h-2 w-2 inline mr-1" />
                {metrics.stockDaysRemaining}d stock
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderFilterContent = (column: ColumnConfig) => {
    switch (column.key) {
      case 'item_type':
        return (
          <Select value={headerFilters.type} onValueChange={(value) => onUpdateHeaderFilter('type', value === 'all' ? '' : value)}>
            <SelectTrigger className="h-8 text-xs border-border/50 bg-background/80">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ASIN">ASIN</SelectItem>
              <SelectItem value="SKU">SKU</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'asin':
        return (
          <Input
            placeholder="Filter ASIN..."
            value={headerFilters.asin}
            onChange={(e) => onUpdateHeaderFilter('asin', e.target.value)}
            className="h-8 text-xs border-border/50 bg-background/80"
          />
        );
      case 'sku':
        return (
          <Input
            placeholder="Filter SKU..."
            value={headerFilters.sku}
            onChange={(e) => onUpdateHeaderFilter('sku', e.target.value)}
            className="h-8 text-xs border-border/50 bg-background/80"
          />
        );
      case 'serial_number':
        return (
          <Input
            placeholder="Filter Serial..."
            value={headerFilters.serial}
            onChange={(e) => onUpdateHeaderFilter('serial', e.target.value)}
            className="h-8 text-xs border-border/50 bg-background/80"
          />
        );
      case 'quantity':
        return (
          <div className="flex gap-1">
            <Input
              placeholder="Min"
              value={headerFilters.quantity.min}
              onChange={(e) => onUpdateHeaderRangeFilter('quantity', 'min', e.target.value)}
              className="h-8 text-xs w-12 border-border/50 bg-background/80"
              type="number"
            />
            <Input
              placeholder="Max"
              value={headerFilters.quantity.max}
              onChange={(e) => onUpdateHeaderRangeFilter('quantity', 'max', e.target.value)}
              className="h-8 text-xs w-12 border-border/50 bg-background/80"
              type="number"
            />
          </div>
        );
      case 'status':
        return (
          <Select value={headerFilters.status} onValueChange={(value) => onUpdateHeaderFilter('status', value === 'all' ? '' : value)}>
            <SelectTrigger className="h-8 text-xs border-border/50 bg-background/80">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'last_sold_date':
      case 'last_order_date':
        return (
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 text-xs opacity-60 hover:opacity-100"
            disabled
          >
            Date Filter
          </Button>
        );
      case 'days_since_ordered':
        return (
          <div className="flex gap-1">
            <Input
              placeholder="Min"
              value={headerFilters.daysSince.min}
              onChange={(e) => onUpdateHeaderRangeFilter('daysSince', 'min', e.target.value)}
              className="h-8 text-xs w-12 border-border/50 bg-background/80"
              type="number"
            />
            <Input
              placeholder="Max"
              value={headerFilters.daysSince.max}
              onChange={(e) => onUpdateHeaderRangeFilter('daysSince', 'max', e.target.value)}
              className="h-8 text-xs w-12 border-border/50 bg-background/80"
              type="number"
            />
          </div>
        );
      case 'metrics':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClearHeaderFilters}
            className="h-8 text-xs border-border/50"
          >
            <X className="h-3 w-3" />
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Column Visibility Control */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="whitespace-nowrap">
              <Columns3 className="h-4 w-4 mr-2" />
              Columns ({visibleColumns.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Table Columns</h4>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={showAllColumns}
                    className="h-6 px-2 text-xs"
                  >
                    Show All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={hideAllColumns}
                    className="h-6 px-2 text-xs"
                  >
                    Hide All
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {columnConfig.map((column) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.key}
                      checked={column.visible}
                      onCheckedChange={() => toggleColumnVisibility(column.key)}
                      disabled={column.key === 'item_type' && visibleColumns.length === 1}
                    />
                    <label 
                      htmlFor={column.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                    >
                      <column.icon className="h-3 w-3" />
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetColumnWidths}
                  className="w-full text-xs"
                >
                  Reset Column Widths
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Enhanced Advanced Data Table with Header Filters */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card via-card/95 to-muted/30 overflow-hidden shadow-lg">
        <Table>
          <TableHeader>
            {/* Sort Headers Row */}
            <TableRow className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b-2 border-primary/20">
              {visibleColumns.map((column, index) => (
                <TableHead
                  key={column.key}
                  className="cursor-pointer select-none hover:bg-primary/15 transition-all duration-200 font-semibold relative group"
                  style={{ 
                    width: `${column.width}px`,
                    minWidth: `${column.minWidth}px`,
                    maxWidth: `${column.width}px`
                  }}
                  onClick={() => column.key !== 'metrics' && onSort(column.key as keyof AllInventoryItem)}
                >
                  <div className="flex items-center gap-2 pr-2">
                    <column.icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{column.label}</span>
                    {column.key !== 'metrics' && (
                      <>
                        <ArrowUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                        {sortConfig.key === column.key && (
                          sortConfig.direction === 'asc' ? 
                            <ArrowUp className="h-3 w-3 text-primary flex-shrink-0" /> : 
                            <ArrowDown className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Resize Handle */}
                  {column.resizable && index < visibleColumns.length - 1 && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-primary/30 cursor-col-resize group-hover:bg-primary/20 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                        setResizeColumnKey(column.key);
                        
                        const startX = e.clientX;
                        const startWidth = column.width;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const deltaX = e.clientX - startX;
                          const newWidth = Math.max(startWidth + deltaX, column.minWidth);
                          updateColumnWidth(column.key, newWidth);
                        };
                        
                        const handleMouseUp = () => {
                          setIsResizing(false);
                          setResizeColumnKey(null);
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  )}
                </TableHead>
              )))}
            </TableRow>
            
            {/* Filter Headers Row */}
            <TableRow className="bg-muted/30 border-b border-border/50">
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className="p-2"
                  style={{ 
                    width: `${column.width}px`,
                    minWidth: `${column.minWidth}px`,
                    maxWidth: `${column.width}px`
                  }}
                >
                  {renderFilterContent(column)}
                </TableHead>
              )))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center p-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <Database className="h-12 w-12 opacity-30" />
                    <div>
                      <p className="text-lg font-medium">No inventory items found</p>
                      <p className="text-sm">Try adjusting your filters or search criteria</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((item) => (
                <TableRow 
                  key={`${item.item_type}-${item.id}`} 
                  className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border-b border-border/50"
                >
                  {visibleColumns.map((column) => (
                    <TableCell 
                      key={column.key}
                      style={{ 
                        width: `${column.width}px`,
                        minWidth: `${column.minWidth}px`,
                        maxWidth: `${column.width}px`
                      }}
                    >
                      {renderCellContent(column, item)}
                    </TableCell>
                  )))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
