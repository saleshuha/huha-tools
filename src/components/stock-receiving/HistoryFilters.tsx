import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface HistoryFilterOptions {
  searchTerm?: string;
  poNumber?: string;
  supplierName?: string;
  startDate?: Date;
  endDate?: Date;
  hasSerial?: boolean;
}

interface HistoryFiltersProps {
  onFilterChange: (filters: HistoryFilterOptions) => void;
  activeFilters: HistoryFilterOptions;
}

export function HistoryFilters({ onFilterChange, activeFilters }: HistoryFiltersProps) {
  const [localFilters, setLocalFilters] = useState<HistoryFilterOptions>(activeFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    const emptyFilters: HistoryFilterOptions = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const activeFilterCount = Object.keys(activeFilters).filter(
    key => activeFilters[key as keyof HistoryFilterOptions] !== undefined
  ).length;

  return (
    <div className="space-y-3">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ASIN, SKU, or Model..."
            value={localFilters.searchTerm || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, searchTerm: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="pl-9"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 relative">
              <Filter className="w-4 h-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Advanced Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-7 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* PO Number Filter */}
              <div className="space-y-2">
                <Label htmlFor="po-filter" className="text-xs font-medium">
                  PO Number
                </Label>
                <Input
                  id="po-filter"
                  placeholder="e.g., 88725VAL"
                  value={localFilters.poNumber || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, poNumber: e.target.value })}
                  className="h-9"
                />
              </div>

              {/* Supplier Filter */}
              <div className="space-y-2">
                <Label htmlFor="supplier-filter" className="text-xs font-medium">
                  Supplier Name
                </Label>
                <Input
                  id="supplier-filter"
                  placeholder="e.g., Sunsky"
                  value={localFilters.supplierName || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, supplierName: e.target.value })}
                  className="h-9"
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal h-9 text-xs",
                          !localFilters.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {localFilters.startDate ? format(localFilters.startDate, "PP") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.startDate}
                        onSelect={(date) => setLocalFilters({ ...localFilters, startDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal h-9 text-xs",
                          !localFilters.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {localFilters.endDate ? format(localFilters.endDate, "PP") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.endDate}
                        onSelect={(date) => setLocalFilters({ ...localFilters, endDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Serial Number Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Items with Serial Numbers</Label>
                <Select
                  value={localFilters.hasSerial === undefined ? 'all' : localFilters.hasSerial ? 'yes' : 'no'}
                  onValueChange={(value) => 
                    setLocalFilters({ 
                      ...localFilters, 
                      hasSerial: value === 'all' ? undefined : value === 'yes' 
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="yes">With Serial Only</SelectItem>
                    <SelectItem value="no">Without Serial Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Apply Button */}
              <Button onClick={handleApply} className="w-full" size="sm">
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleApply} className="gap-2">
          <Search className="w-4 h-4" />
          Search
        </Button>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          
          {activeFilters.searchTerm && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
              <span>Search: {activeFilters.searchTerm}</span>
              <X 
                className="w-3 h-3 cursor-pointer hover:text-primary/70" 
                onClick={() => {
                  const newFilters = { ...activeFilters };
                  delete newFilters.searchTerm;
                  onFilterChange(newFilters);
                }}
              />
            </div>
          )}

          {activeFilters.poNumber && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
              <span>PO: {activeFilters.poNumber}</span>
              <X 
                className="w-3 h-3 cursor-pointer hover:text-primary/70" 
                onClick={() => {
                  const newFilters = { ...activeFilters };
                  delete newFilters.poNumber;
                  onFilterChange(newFilters);
                }}
              />
            </div>
          )}

          {activeFilters.supplierName && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
              <span>Supplier: {activeFilters.supplierName}</span>
              <X 
                className="w-3 h-3 cursor-pointer hover:text-primary/70" 
                onClick={() => {
                  const newFilters = { ...activeFilters };
                  delete newFilters.supplierName;
                  onFilterChange(newFilters);
                }}
              />
            </div>
          )}

          {(activeFilters.startDate || activeFilters.endDate) && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
              <span>
                {activeFilters.startDate && format(activeFilters.startDate, 'PP')}
                {activeFilters.startDate && activeFilters.endDate && ' - '}
                {activeFilters.endDate && format(activeFilters.endDate, 'PP')}
              </span>
              <X 
                className="w-3 h-3 cursor-pointer hover:text-primary/70" 
                onClick={() => {
                  const newFilters = { ...activeFilters };
                  delete newFilters.startDate;
                  delete newFilters.endDate;
                  onFilterChange(newFilters);
                }}
              />
            </div>
          )}

          {activeFilters.hasSerial !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
              <span>{activeFilters.hasSerial ? 'With Serial' : 'Without Serial'}</span>
              <X 
                className="w-3 h-3 cursor-pointer hover:text-primary/70" 
                onClick={() => {
                  const newFilters = { ...activeFilters };
                  delete newFilters.hasSerial;
                  onFilterChange(newFilters);
                }}
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 text-xs px-2"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
