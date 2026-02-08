import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Search, X, TrendingDown, TrendingUp, Minus, SlidersHorizontal, ChevronDown, FileText } from 'lucide-react';
import { ReturnsFilters } from '@/types/amazon-returns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReturnsFilterPanelProps {
  filters: ReturnsFilters;
  onFiltersChange: (filters: ReturnsFilters) => void;
  fileNames?: string[];
}

export const ReturnsFilterPanel: React.FC<ReturnsFilterPanelProps> = ({
  filters,
  onFiltersChange,
  fileNames = [],
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  const handleFileNameChange = (value: string) => {
    onFiltersChange({ ...filters, fileName: value === 'all' ? undefined : value });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = [
    filters.searchQuery,
    filters.dateRange,
    filters.returnRatioRange,
    filters.quickFilter,
    filters.fileName,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ASIN or product title..."
            value={filters.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-1.5">
          <Badge
            variant={filters.quickFilter === 'high' ? 'default' : 'outline'}
            className="cursor-pointer h-7 px-2.5 text-xs"
            onClick={() => handleQuickFilter('high')}
          >
            <TrendingDown className="w-3 h-3 mr-1" />
            High &gt;20%
          </Badge>
          <Badge
            variant={filters.quickFilter === 'medium' ? 'default' : 'outline'}
            className="cursor-pointer h-7 px-2.5 text-xs"
            onClick={() => handleQuickFilter('medium')}
          >
            <Minus className="w-3 h-3 mr-1" />
            Med 10-20%
          </Badge>
          <Badge
            variant={filters.quickFilter === 'low' ? 'default' : 'outline'}
            className="cursor-pointer h-7 px-2.5 text-xs"
            onClick={() => handleQuickFilter('low')}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Low &lt;10%
          </Badge>
        </div>

        {/* Advanced Toggle */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Advanced
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Upload Date Range</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={handleDateRangeChange}
              />
            </div>

            {/* Return Ratio Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Return Ratio: {filters.returnRatioRange?.min || 0}% – {filters.returnRatioRange?.max || 100}%
              </Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[filters.returnRatioRange?.min || 0, filters.returnRatioRange?.max || 100]}
                onValueChange={handleRatioRangeChange}
                className="mt-3"
              />
            </div>

            {/* File Name Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Source File</Label>
              <Select value={filters.fileName || 'all'} onValueChange={handleFileNameChange}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="All files" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All files</SelectItem>
                  {fileNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
