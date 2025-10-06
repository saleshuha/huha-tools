import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Search, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { ReturnsFilters } from '@/types/amazon-returns';

interface ReturnsFilterPanelProps {
  filters: ReturnsFilters;
  onFiltersChange: (filters: ReturnsFilters) => void;
}

export const ReturnsFilterPanel: React.FC<ReturnsFilterPanelProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchQuery: value });
  };

  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleRatioRangeChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      returnRatioRange: { min: values[0], max: values[1] },
    });
  };

  const handleQuickFilter = (filter: 'high' | 'medium' | 'low') => {
    if (filters.quickFilter === filter) {
      onFiltersChange({ ...filters, quickFilter: null });
    } else {
      onFiltersChange({ ...filters, quickFilter: filter });
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = 
    filters.searchQuery ||
    filters.dateRange ||
    filters.returnRatioRange ||
    filters.quickFilter;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ASIN or product title..."
            value={filters.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Filters</Label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.quickFilter === 'high' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleQuickFilter('high')}
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              High (&gt;20%)
            </Badge>
            <Badge
              variant={filters.quickFilter === 'medium' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleQuickFilter('medium')}
            >
              <Minus className="w-3 h-3 mr-1" />
              Medium (10-20%)
            </Badge>
            <Badge
              variant={filters.quickFilter === 'low' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleQuickFilter('low')}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Low (&lt;10%)
            </Badge>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Upload Date Range</Label>
          <DatePickerWithRange
            date={filters.dateRange}
            onDateChange={handleDateRangeChange}
          />
        </div>

        {/* Return Ratio Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Return Ratio Range: {filters.returnRatioRange?.min || 0}% - {filters.returnRatioRange?.max || 100}%
          </Label>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[filters.returnRatioRange?.min || 0, filters.returnRatioRange?.max || 100]}
            onValueChange={handleRatioRangeChange}
            className="mt-2"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
