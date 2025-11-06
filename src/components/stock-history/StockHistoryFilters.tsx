import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Calendar } from 'lucide-react';
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
    <div className="space-y-3">
      {/* Primary Filters Row */}
      <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-lg">
        <Input
          placeholder="Search reference, notes, or user..."
          value={filters.searchTerm}
          onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
          className="max-w-xs h-9 text-sm"
        />
        
        <Select 
          value={filters.selectedReferenceType} 
          onValueChange={(value) => onFilterChange({ ...filters, selectedReferenceType: value })}
        >
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Filter by type" />
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

        <Select 
          value={filters.changeType} 
          onValueChange={(value: any) => onFilterChange({ ...filters, changeType: value })}
        >
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Changes</SelectItem>
            <SelectItem value="increase">Increases Only</SelectItem>
            <SelectItem value="decrease">Decreases Only</SelectItem>
          </SelectContent>
        </Select>

        <DatePickerWithRange
          date={filters.dateRange}
          onDateChange={(range) => onFilterChange({ ...filters, dateRange: range })}
          className="w-auto"
        />

        {users.length > 0 && (
          <Select 
            value={filters.selectedUser || 'all'} 
            onValueChange={(value) => onFilterChange({ ...filters, selectedUser: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Filter by user" />
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

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="h-9 text-xs gap-1"
          >
            <X className="w-3 h-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-muted-foreground font-medium">Active filters:</span>
          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchTerm}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFilterChange({ ...filters, searchTerm: '' })}
              />
            </Badge>
          )}
          {filters.selectedReferenceType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {REFERENCE_TYPE_LABELS[filters.selectedReferenceType] || filters.selectedReferenceType}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFilterChange({ ...filters, selectedReferenceType: 'all' })}
              />
            </Badge>
          )}
          {filters.changeType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.changeType === 'increase' ? 'Increases' : 'Decreases'} Only
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFilterChange({ ...filters, changeType: 'all' })}
              />
            </Badge>
          )}
          {filters.dateRange?.from && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" />
              Date Range
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => onFilterChange({ ...filters, dateRange: undefined })}
              />
            </Badge>
          )}
          <span className="text-muted-foreground ml-2">
            Showing {filteredCount} of {totalCount} changes
          </span>
        </div>
      )}
    </div>
  );
}
