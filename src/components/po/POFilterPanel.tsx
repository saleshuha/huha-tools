import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type FilterState = {
  quickFilter: 'all' | 'in-stock' | 'out-of-stock' | 'pending' | 'closed' | 'with-sunsky' | 'no-tracking';
  status: string[];
  inventoryStatus: 'all' | 'in-stock' | 'out-of-stock' | 'not-found';
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

export function POFilterPanel({ filters, onFilterChange, stats }: POFilterPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const quickFilters = [
    { value: 'all', label: 'All Items', count: stats.total, color: 'bg-primary/10 text-primary hover:bg-primary/20' },
    { value: 'in-stock', label: 'In Stock', count: stats.inStock, color: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20' },
    { value: 'out-of-stock', label: 'Out of Stock', count: stats.outOfStock, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20' },
    { value: 'pending', label: 'Pending', count: stats.pending, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20' },
    { value: 'closed', label: 'Closed', count: stats.closed, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20' },
    { value: 'with-sunsky', label: 'With Sunsky', count: stats.withSunsky, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20' },
    { value: 'no-tracking', label: 'No Tracking', count: stats.noTracking, color: 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20' },
  ];

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
      inventoryStatus: 'all',
      quantityMin: '',
      quantityMax: '',
      costMin: '',
      costMax: '',
      hasTracking: 'all',
      hasSunskySku: 'all',
    });
  };

  const hasActiveFilters = filters.quickFilter !== 'all' || 
    filters.status.length > 0 || 
    filters.inventoryStatus !== 'all' ||
    filters.quantityMin || 
    filters.quantityMax || 
    filters.costMin || 
    filters.costMax ||
    filters.hasTracking !== 'all' ||
    filters.hasSunskySku !== 'all';

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header with Clear Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Filters</h3>
              <p className="text-xs text-muted-foreground">
                {hasActiveFilters ? `${Object.values(filters).filter(v => v !== 'all' && v !== '' && (Array.isArray(v) ? v.length > 0 : true)).length} active` : 'No filters applied'}
              </p>
            </div>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Quick Filters</Label>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => {
              const isActive = filters.quickFilter === filter.value;
              return (
                <Badge
                  key={filter.value}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'shadow-md scale-105' 
                      : `${filter.color} hover:scale-105`
                  }`}
                  onClick={() => handleQuickFilterClick(filter.value)}
                >
                  <span className="font-medium">{filter.label}</span>
                  <span className="ml-1.5 opacity-70">({filter.count})</span>
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} className="space-y-3">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-medium">Advanced Filters</span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-3.5 w-3.5 ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-300">
            <div className="p-3 rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Inventory Status */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Inventory Status</Label>
                  <Select
                    value={filters.inventoryStatus}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, inventoryStatus: value as FilterState['inventoryStatus'] })
                    }
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-stock">✓ In Stock</SelectItem>
                      <SelectItem value="out-of-stock">⏳ Out of Stock</SelectItem>
                      <SelectItem value="not-found">❌ Not Found</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Has Tracking */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tracking Info</Label>
                  <Select
                    value={filters.hasTracking}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, hasTracking: value as FilterState['hasTracking'] })
                    }
                  >
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
                  <Select
                    value={filters.hasSunskySku}
                    onValueChange={(value) =>
                      onFilterChange({ ...filters, hasSunskySku: value as FilterState['hasSunskySku'] })
                    }
                  >
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
                    <Input
                      type="number"
                      placeholder="Min"
                      className="h-9 bg-background"
                      value={filters.quantityMin}
                      onChange={(e) =>
                        onFilterChange({ ...filters, quantityMin: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      className="h-9 bg-background"
                      value={filters.quantityMax}
                      onChange={(e) =>
                        onFilterChange({ ...filters, quantityMax: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Cost Range */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Cost Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="h-9 bg-background"
                      value={filters.costMin}
                      onChange={(e) =>
                        onFilterChange({ ...filters, costMin: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      className="h-9 bg-background"
                      value={filters.costMax}
                      onChange={(e) =>
                        onFilterChange({ ...filters, costMax: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
