import { useState, useMemo, useCallback } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

export type EnhancedFilterState = {
  // Quick filters
  quickFilter: 'all' | 'in-stock' | 'out-of-stock' | 'pending' | 'closed' | 'with-sunsky' | 'no-tracking';
  
  // Basic filters
  inventoryStatus: string[];
  hasTracking: 'all' | 'yes' | 'no';
  hasSunskySku: 'all' | 'yes' | 'no';
  
  // Range filters
  quantityMin: string;
  quantityMax: string;
  costMin: string;
  costMax: string;
  priceMin: string;
  priceMax: string;
  
  // Advanced filters
  orderStatus: string[];
  supplierFilter: string;
  asinSkuSearch: string;
  dateRange: DateRange | undefined;
  printStatus: 'all' | 'printed' | 'not-printed';
  matchingConfidence: 'all' | 'high' | 'medium' | 'low' | 'unmatched';
};

interface EnhancedFilterPanelProps {
  filters: EnhancedFilterState;
  onFilterChange: (filters: EnhancedFilterState) => void;
  stats: {
    total: number;
    inStock: number;
    outOfStock: number;
    pending: number;
    closed: number;
    withSunsky: number;
    noTracking: number;
  };
}

export function EnhancedFilterPanel({ filters, onFilterChange, stats }: EnhancedFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout>();

  const quickFilters = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'in-stock', label: 'In Stock', count: stats.inStock },
    { value: 'out-of-stock', label: 'Out of Stock', count: stats.outOfStock },
    { value: 'pending', label: 'Pending', count: stats.pending },
    { value: 'closed', label: 'Closed', count: stats.closed },
    { value: 'with-sunsky', label: 'Sunsky', count: stats.withSunsky },
    { value: 'no-tracking', label: 'No Tracking', count: stats.noTracking }
  ];

  const inventoryStatusOptions = [
    { value: 'in-stock', label: 'In Stock' },
    { value: 'out-of-stock', label: 'Out of Stock' },
    { value: 'not-found', label: 'Not Found' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' }
  ];

  const orderStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'closed', label: 'Closed' }
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.quickFilter !== 'all') count++;
    if (filters.inventoryStatus.length > 0) count++;
    if (filters.hasTracking !== 'all') count++;
    if (filters.hasSunskySku !== 'all') count++;
    if (filters.quantityMin || filters.quantityMax) count++;
    if (filters.costMin || filters.costMax) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.orderStatus.length > 0) count++;
    if (filters.supplierFilter) count++;
    if (filters.asinSkuSearch) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.printStatus !== 'all') count++;
    if (filters.matchingConfidence !== 'all') count++;
    return count;
  }, [filters]);

  const handleClearAll = useCallback(() => {
    onFilterChange({
      quickFilter: 'all',
      inventoryStatus: [],
      hasTracking: 'all',
      hasSunskySku: 'all',
      quantityMin: '',
      quantityMax: '',
      costMin: '',
      costMax: '',
      priceMin: '',
      priceMax: '',
      orderStatus: [],
      supplierFilter: '',
      asinSkuSearch: '',
      dateRange: undefined,
      printStatus: 'all',
      matchingConfidence: 'all'
    });
  }, [onFilterChange]);

  const handleDebouncedSearch = useCallback((field: 'supplierFilter' | 'asinSkuSearch', value: string) => {
    if (searchDebounce) clearTimeout(searchDebounce);
    const timeout = setTimeout(() => {
      onFilterChange({ ...filters, [field]: value });
    }, 300);
    setSearchDebounce(timeout);
  }, [filters, onFilterChange, searchDebounce]);

  const handleInventoryStatusToggle = (status: string) => {
    const newStatus = filters.inventoryStatus.includes(status)
      ? filters.inventoryStatus.filter(s => s !== status)
      : [...filters.inventoryStatus, status];
    onFilterChange({ ...filters, inventoryStatus: newStatus });
  };

  const handleOrderStatusToggle = (status: string) => {
    const newStatus = filters.orderStatus.includes(status)
      ? filters.orderStatus.filter(s => s !== status)
      : [...filters.orderStatus, status];
    onFilterChange({ ...filters, orderStatus: newStatus });
  };

  const removeFilter = (filterKey: keyof EnhancedFilterState) => {
    const updates: Partial<EnhancedFilterState> = {};
    if (filterKey === 'inventoryStatus' || filterKey === 'orderStatus') {
      updates[filterKey] = [];
    } else if (filterKey === 'dateRange') {
      updates[filterKey] = undefined;
    } else if (filterKey === 'hasTracking' || filterKey === 'hasSunskySku' || filterKey === 'printStatus' || filterKey === 'matchingConfidence') {
      updates[filterKey] = 'all' as any;
    } else if (filterKey === 'quickFilter') {
      updates[filterKey] = 'all' as any;
    } else {
      (updates as any)[filterKey] = '';
    }
    onFilterChange({ ...filters, ...updates } as EnhancedFilterState);
  };

  const activeFilterPills = useMemo(() => {
    const pills: { label: string; key: keyof EnhancedFilterState }[] = [];
    
    if (filters.quickFilter !== 'all') {
      const qf = quickFilters.find(f => f.value === filters.quickFilter);
      pills.push({ label: qf?.label || filters.quickFilter, key: 'quickFilter' });
    }
    if (filters.inventoryStatus.length > 0) {
      pills.push({ label: `Inv: ${filters.inventoryStatus.length}`, key: 'inventoryStatus' });
    }
    if (filters.orderStatus.length > 0) {
      pills.push({ label: `Status: ${filters.orderStatus.length}`, key: 'orderStatus' });
    }
    if (filters.hasTracking !== 'all') {
      pills.push({ label: filters.hasTracking === 'yes' ? 'Has Tracking' : 'No Tracking', key: 'hasTracking' });
    }
    if (filters.hasSunskySku !== 'all') {
      pills.push({ label: filters.hasSunskySku === 'yes' ? 'Has Sunsky' : 'No Sunsky', key: 'hasSunskySku' });
    }
    if (filters.quantityMin || filters.quantityMax) {
      pills.push({ label: `Qty: ${filters.quantityMin || '0'}-${filters.quantityMax || '∞'}`, key: 'quantityMin' });
    }
    if (filters.costMin || filters.costMax) {
      pills.push({ label: `Cost: ${filters.costMin || '0'}-${filters.costMax || '∞'}`, key: 'costMin' });
    }
    if (filters.priceMin || filters.priceMax) {
      pills.push({ label: `Price: ${filters.priceMin || '0'}-${filters.priceMax || '∞'}`, key: 'priceMin' });
    }
    if (filters.supplierFilter) {
      pills.push({ label: `Supplier: ${filters.supplierFilter}`, key: 'supplierFilter' });
    }
    if (filters.asinSkuSearch) {
      pills.push({ label: `Search: ${filters.asinSkuSearch}`, key: 'asinSkuSearch' });
    }
    if (filters.dateRange?.from || filters.dateRange?.to) {
      pills.push({ label: 'Date Range', key: 'dateRange' });
    }
    if (filters.printStatus !== 'all') {
      pills.push({ label: filters.printStatus === 'printed' ? 'Printed' : 'Not Printed', key: 'printStatus' });
    }
    if (filters.matchingConfidence !== 'all') {
      pills.push({ label: `Match: ${filters.matchingConfidence}`, key: 'matchingConfidence' });
    }
    
    return pills;
  }, [filters, quickFilters]);

  return (
    <div className="space-y-2 bg-card border border-border/40 rounded-lg shadow-sm">
      {/* Compact Header */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-3 pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-accent">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Quick Filters - Always Visible */}
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map(qf => (
              <Badge
                key={qf.value}
                variant={filters.quickFilter === qf.value ? "default" : "outline"}
                className={cn(
                  "cursor-pointer hover:bg-accent text-xs px-2 py-1",
                  filters.quickFilter === qf.value && "bg-primary text-primary-foreground"
                )}
                onClick={() => onFilterChange({ ...filters, quickFilter: qf.value as any })}
              >
                {qf.label} ({qf.count})
              </Badge>
            ))}
          </div>
        </div>

        {/* Active Filter Pills */}
        {activeFilterPills.length > 0 && (
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {activeFilterPills.map(pill => (
                <Badge
                  key={pill.key}
                  variant="secondary"
                  className="h-6 px-2 text-xs gap-1 hover:bg-secondary/80"
                >
                  {pill.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeFilter(pill.key)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Filters - Collapsible */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
            {/* Row 1: Search & Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">ASIN/SKU Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="h-8 pl-7 text-xs"
                    defaultValue={filters.asinSkuSearch}
                    onChange={(e) => handleDebouncedSearch('asinSkuSearch', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Supplier</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Supplier name..."
                    className="h-8 pl-7 text-xs"
                    defaultValue={filters.supplierFilter}
                    onChange={(e) => handleDebouncedSearch('supplierFilter', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-start text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {filters.dateRange?.from ? 'Selected' : 'Pick dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <DatePickerWithRange
                      date={filters.dateRange}
                      onDateChange={(date) => onFilterChange({ ...filters, dateRange: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 2: Status Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Inventory Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-between text-xs">
                      <span>{filters.inventoryStatus.length || 'All'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2 z-50" align="start">
                    <div className="space-y-2">
                      {inventoryStatusOptions.map(opt => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={opt.value}
                            checked={filters.inventoryStatus.includes(opt.value)}
                            onCheckedChange={() => handleInventoryStatusToggle(opt.value)}
                          />
                          <Label htmlFor={opt.value} className="text-xs cursor-pointer">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Order Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-between text-xs">
                      <span>{filters.orderStatus.length || 'All'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2 z-50" align="start">
                    <div className="space-y-2">
                      {orderStatusOptions.map(opt => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`order-${opt.value}`}
                            checked={filters.orderStatus.includes(opt.value)}
                            onCheckedChange={() => handleOrderStatusToggle(opt.value)}
                          />
                          <Label htmlFor={`order-${opt.value}`} className="text-xs cursor-pointer">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tracking</Label>
                <Select value={filters.hasTracking} onValueChange={(v: any) => onFilterChange({ ...filters, hasTracking: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">With Tracking</SelectItem>
                    <SelectItem value="no">No Tracking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Sunsky SKU</Label>
                <Select value={filters.hasSunskySku} onValueChange={(v: any) => onFilterChange({ ...filters, hasSunskySku: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">With Sunsky</SelectItem>
                    <SelectItem value="no">No Sunsky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Range Filters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Qty Range</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-8 text-xs"
                    value={filters.quantityMin}
                    onChange={(e) => onFilterChange({ ...filters, quantityMin: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-8 text-xs"
                    value={filters.quantityMax}
                    onChange={(e) => onFilterChange({ ...filters, quantityMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cost Range</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-8 text-xs"
                    value={filters.costMin}
                    onChange={(e) => onFilterChange({ ...filters, costMin: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-8 text-xs"
                    value={filters.costMax}
                    onChange={(e) => onFilterChange({ ...filters, costMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Price Range</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="h-8 text-xs"
                    value={filters.priceMin}
                    onChange={(e) => onFilterChange({ ...filters, priceMin: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    className="h-8 text-xs"
                    value={filters.priceMax}
                    onChange={(e) => onFilterChange({ ...filters, priceMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Print Status</Label>
                <Select value={filters.printStatus} onValueChange={(v: any) => onFilterChange({ ...filters, printStatus: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="printed">Printed</SelectItem>
                    <SelectItem value="not-printed">Not Printed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Match Quality</Label>
                <Select value={filters.matchingConfidence} onValueChange={(v: any) => onFilterChange({ ...filters, matchingConfidence: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="unmatched">Unmatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
