import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, X, Filter } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface AdvancedFiltersPanelProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  statusFilter: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  valueRange: [number, number];
  onValueRangeChange: (range: [number, number]) => void;
  quantityRange: [number, number];
  onQuantityRangeChange: (range: [number, number]) => void;
  maxValue: number;
  maxQuantity: number;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  valueRange,
  onValueRangeChange,
  quantityRange,
  onQuantityRangeChange,
  maxValue,
  maxQuantity,
  onClearFilters,
  activeFilterCount
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'closed', label: 'Fulfilled from Stock' },
    { value: 'partial-fulfilled', label: 'Partial from Stock' }
  ];

  const toggleStatus = (status: string) => {
    if (statusFilter.includes(status)) {
      onStatusFilterChange(statusFilter.filter(s => s !== status));
    } else {
      onStatusFilterChange([...statusFilter, status]);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="flex items-center gap-1">
            <X className="h-3 w-3" />
            Clear All Filters
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={onDateRangeChange}
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={statusFilter.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Value Range */}
              <div className="space-y-4">
                <Label>Value Range (0 - {maxValue.toFixed(0)})</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={maxValue}
                    step={10}
                    value={valueRange}
                    onValueChange={(value) => onValueRangeChange(value as [number, number])}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{valueRange[0].toFixed(0)}</span>
                    <span>{valueRange[1].toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Range */}
              <div className="space-y-4">
                <Label>Quantity Range (0 - {maxQuantity})</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={maxQuantity}
                    step={1}
                    value={quantityRange}
                    onValueChange={(value) => onQuantityRangeChange(value as [number, number])}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{quantityRange[0]}</span>
                    <span>{quantityRange[1]}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
