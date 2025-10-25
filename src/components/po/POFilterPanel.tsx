import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type FilterState = {
  quickFilter: 'all' | 'in-stock' | 'out-of-stock' | 'pending' | 'closed' | 'with-sunsky' | 'no-tracking';
  status: string[];
  inventoryStatus: string[];
  quantityMin: string;
  quantityMax: string;
  costMin: string;
  costMax: string;
  hasTracking: 'all' | 'yes' | 'no';
  hasSunskySku: 'all' | 'yes' | 'no';
};
interface POFilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
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
export function POFilterPanel({
  filters,
  onFilterChange,
  stats
}: POFilterPanelProps) {
  const quickFilters = [{
    value: 'all',
    label: 'All Items',
    count: stats.total,
    color: 'bg-primary/10 text-primary hover:bg-primary/20'
  }, {
    value: 'in-stock',
    label: 'In Stock',
    count: stats.inStock,
    color: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20'
  }, {
    value: 'out-of-stock',
    label: 'Out of Stock',
    count: stats.outOfStock,
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20'
  }, {
    value: 'pending',
    label: 'Pending',
    count: stats.pending,
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20'
  }, {
    value: 'closed',
    label: 'Closed',
    count: stats.closed,
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20'
  }, {
    value: 'with-sunsky',
    label: 'With Sunsky',
    count: stats.withSunsky,
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20'
  }, {
    value: 'no-tracking',
    label: 'No Tracking',
    count: stats.noTracking,
    color: 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20'
  }];
  const handleQuickFilterClick = (value: string) => {
    onFilterChange({
      ...filters,
      quickFilter: value as FilterState['quickFilter']
    });
  };
  const handleClearAllFilters = () => {
    onFilterChange({
      quickFilter: 'all',
      status: [],
      inventoryStatus: [],
      quantityMin: '',
      quantityMax: '',
      costMin: '',
      costMax: '',
      hasTracking: 'all',
      hasSunskySku: 'all'
    });
  };

  const handleInventoryStatusToggle = (status: string) => {
    const newStatus = filters.inventoryStatus.includes(status)
      ? filters.inventoryStatus.filter(s => s !== status)
      : [...filters.inventoryStatus, status];
    onFilterChange({ ...filters, inventoryStatus: newStatus });
  };

  const inventoryStatusOptions = [
    { value: 'in-stock', label: '✓ In Stock', color: 'text-green-700 dark:text-green-400' },
    { value: 'out-of-stock', label: '⏳ Out of Stock', color: 'text-orange-700 dark:text-orange-400' },
    { value: 'not-found', label: '❌ Not Found', color: 'text-gray-700 dark:text-gray-400' },
    { value: 'pending', label: '⏰ Pending', color: 'text-yellow-700 dark:text-yellow-400' },
    { value: 'closed', label: '✅ Closed', color: 'text-blue-700 dark:text-blue-400' },
  ];

  const hasActiveFilters = filters.quickFilter !== 'all' || filters.status.length > 0 || filters.inventoryStatus.length > 0 || filters.quantityMin || filters.quantityMax || filters.costMin || filters.costMax || filters.hasTracking !== 'all' || filters.hasSunskySku !== 'all';
  return <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header with Clear Button */}
        

        {/* Quick Filters */}
        

        {/* Advanced Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Advanced Filters</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Inventory Status - Multi-select */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Inventory Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-9 w-full justify-between bg-background hover:bg-background"
                    >
                      <span className="text-sm">
                        {filters.inventoryStatus.length === 0 
                          ? 'All Status' 
                          : `${filters.inventoryStatus.length} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 bg-popover border-border z-50" align="start">
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Select inventory statuses
                      </div>
                      {inventoryStatusOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`inv-status-${option.value}`}
                            checked={filters.inventoryStatus.includes(option.value)}
                            onCheckedChange={() => handleInventoryStatusToggle(option.value)}
                          />
                          <Label
                            htmlFor={`inv-status-${option.value}`}
                            className={`text-sm cursor-pointer ${option.color}`}
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                      {filters.inventoryStatus.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => onFilterChange({ ...filters, inventoryStatus: [] })}
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Has Tracking */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tracking Info</Label>
                <Select value={filters.hasTracking} onValueChange={value => onFilterChange({
                ...filters,
                hasTracking: value as FilterState['hasTracking']
              })}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="yes">✓ With Tracking</SelectItem>
                    <SelectItem value="no">❌ No Tracking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Has Sunsky SKU */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Sunsky SKU</Label>
                <Select value={filters.hasSunskySku} onValueChange={value => onFilterChange({
                ...filters,
                hasSunskySku: value as FilterState['hasSunskySku']
              })}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="yes">✓ With Sunsky</SelectItem>
                    <SelectItem value="no">❌ No Sunsky</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Quantity Range</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Min" className="h-9 bg-background" value={filters.quantityMin} onChange={e => onFilterChange({
                  ...filters,
                  quantityMin: e.target.value
                })} />
                  <Input type="number" placeholder="Max" className="h-9 bg-background" value={filters.quantityMax} onChange={e => onFilterChange({
                  ...filters,
                  quantityMax: e.target.value
                })} />
                </div>
              </div>

              {/* Cost Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Cost Range</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Min" className="h-9 bg-background" value={filters.costMin} onChange={e => onFilterChange({
                  ...filters,
                  costMin: e.target.value
                })} />
                  <Input type="number" placeholder="Max" className="h-9 bg-background" value={filters.costMax} onChange={e => onFilterChange({
                  ...filters,
                  costMax: e.target.value
                })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
}