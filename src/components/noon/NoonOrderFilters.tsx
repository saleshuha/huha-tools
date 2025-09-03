import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  Store,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Truck,
  MapPin
} from 'lucide-react';
import { useNoonStores } from '@/hooks/useNoonStores';

export interface FilterState {
  search: string;
  status: string;
  storeId: string;
  dateRange: string;
}

interface NoonOrderFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalOrders: number;
  filteredOrders: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status', icon: Package },
  { value: 'uploaded', label: 'Uploaded', icon: Package },
  { value: 'validated', label: 'Validated', icon: CheckCircle },
  { value: 'ready_for_sunsky', label: 'Ready for Sunsky', icon: Clock },
  { value: 'placed', label: 'Placed', icon: Send },
  { value: 'shipped', label: 'Shipped', icon: Truck },
  { value: 'delivered', label: 'Delivered', icon: MapPin },
  { value: 'exception', label: 'Exceptions', icon: AlertTriangle },
];

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
];

export function NoonOrderFilters({ 
  filters, 
  onFiltersChange, 
  totalOrders, 
  filteredOrders 
}: NoonOrderFiltersProps) {
  const { stores } = useNoonStores();
  
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      storeId: 'all-stores',
      dateRange: 'all',
    });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || (filters.storeId && filters.storeId !== 'all-stores') || filters.dateRange !== 'all';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders, SKUs, purchase items..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Store Filter */}
            <Select value={filters.storeId} onValueChange={(value) => handleFilterChange('storeId', value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Store className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-stores">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} ({store.country})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredOrders} of {totalOrders} orders</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  Filtered
                </Badge>
              )}
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                {filters.search && (
                  <Badge variant="outline" className="text-xs">
                    Search: "{filters.search}"
                  </Badge>
                )}
                {filters.status !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    Status: {STATUS_OPTIONS.find(s => s.value === filters.status)?.label}
                  </Badge>
                )}
                {filters.storeId && filters.storeId !== 'all-stores' && (
                  <Badge variant="outline" className="text-xs">
                    Store: {stores.find(s => s.id === filters.storeId)?.name}
                  </Badge>
                )}
                {filters.dateRange !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    Date: {DATE_RANGE_OPTIONS.find(d => d.value === filters.dateRange)?.label}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}