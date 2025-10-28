import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, X, Filter, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

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
          <CardContent className="pt-4 pb-4">
            {/* Compact Horizontal Layout */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range - Compact */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Date:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Calendar className="h-3 w-3 mr-1" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Pick dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={onDateRangeChange}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border" />

              {/* Status Filter - Compact Badges */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Status:</Label>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={statusFilter.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80 text-xs h-6 px-2"
                      onClick={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border" />

              {/* Value Range - Compact Inputs */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Value:</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={valueRange[0]}
                  onChange={(e) => onValueRangeChange([Number(e.target.value), valueRange[1]])}
                  className="w-20 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={valueRange[1]}
                  onChange={(e) => onValueRangeChange([valueRange[0], Number(e.target.value)])}
                  className="w-20 h-8 text-xs"
                />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-border" />

              {/* Quantity Range - Compact Inputs */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Qty:</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={quantityRange[0]}
                  onChange={(e) => onQuantityRangeChange([Number(e.target.value), quantityRange[1]])}
                  className="w-16 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={quantityRange[1]}
                  onChange={(e) => onQuantityRangeChange([quantityRange[0], Number(e.target.value)])}
                  className="w-16 h-8 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
