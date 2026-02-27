import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, ArrowUpDown, User } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export interface StockHistoryFilterState {
  searchTerm: string;
  selectedReferenceType: string;
  dateRange?: DateRange;
  minChangeAmount?: number;
  maxChangeAmount?: number;
  changeType: 'all' | 'increase' | 'decrease';
  selectedUser?: string;
}

interface StockHistoryFiltersProps {
  filters: StockHistoryFilterState;
  onFilterChange: (filters: StockHistoryFilterState) => void;
  referenceTypes: string[];
  users: Array<{ id: string; email: string }>;
  totalCount: number;
  filteredCount: number;
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  po_order: 'PO Fulfillment',
  manual: 'Manual Adjustment',
  sale: 'Sale',
  restock: 'Restock',
  return: 'Return',
  damage: 'Damage',
  adjustment: 'Adjustment',
};

export function StockHistoryFilters({
  filters,
  onFilterChange,
  referenceTypes,
  users,
  totalCount,
  filteredCount,
}: StockHistoryFiltersProps) {
  const hasActiveFilters = 
    filters.searchTerm || 
    filters.selectedReferenceType !== 'all' ||
    filters.dateRange?.from ||
    filters.changeType !== 'all' ||
    filters.selectedUser;

  const clearAllFilters = () => {
    onFilterChange({
      searchTerm: '',
      selectedReferenceType: 'all',
      dateRange: undefined,
      changeType: 'all',
      selectedUser: undefined,
    });
  };

  return (
    <div className="space-y-2">
      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search reference, notes, or user..."
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
              className="pl-8 h-8 text-xs"
            />
          </div>
          
          {/* Type Filter */}
          <Select 
            value={filters.selectedReferenceType} 
            onValueChange={(value) => onFilterChange({ ...filters, selectedReferenceType: value })}
          >
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {referenceTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {REFERENCE_TYPE_LABELS[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Change Direction */}
          <Select 
            value={filters.changeType} 
            onValueChange={(value: any) => onFilterChange({ ...filters, changeType: value })}
          >
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="increase">Increases Only</SelectItem>
              <SelectItem value="decrease">Decreases Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <DatePickerWithRange
            date={filters.dateRange}
            onDateChange={(range) => onFilterChange({ ...filters, dateRange: range })}
            className="w-auto"
          />

          {/* User Filter */}
          {users.length > 0 && (
            <Select 
              value={filters.selectedUser || 'all'} 
              onValueChange={(value) => onFilterChange({ ...filters, selectedUser: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                <User className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear */}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 items-center px-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Filters:</span>
          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1 text-[11px] h-5 px-2 font-normal">
              Search: "{filters.searchTerm}"
              <X 
                className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" 
                onClick={() => onFilterChange({ ...filters, searchTerm: '' })}
              />
            </Badge>
          )}
          {filters.selectedReferenceType !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-[11px] h-5 px-2 font-normal">
              {REFERENCE_TYPE_LABELS[filters.selectedReferenceType] || filters.selectedReferenceType}
              <X 
                className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" 
                onClick={() => onFilterChange({ ...filters, selectedReferenceType: 'all' })}
              />
            </Badge>
          )}
          {filters.changeType !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-[11px] h-5 px-2 font-normal">
              {filters.changeType === 'increase' ? '↑ Increases' : '↓ Decreases'}
              <X 
                className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" 
                onClick={() => onFilterChange({ ...filters, changeType: 'all' })}
              />
            </Badge>
          )}
          {filters.dateRange?.from && (
            <Badge variant="secondary" className="gap-1 text-[11px] h-5 px-2 font-normal">
              <Calendar className="w-2.5 h-2.5" />
              Date Range
              <X 
                className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" 
                onClick={() => onFilterChange({ ...filters, dateRange: undefined })}
              />
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {filteredCount}/{totalCount}
          </span>
        </div>
      )}
    </div>
  );
}
