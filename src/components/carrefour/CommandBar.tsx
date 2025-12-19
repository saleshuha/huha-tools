import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  CalendarIcon, 
  Download, 
  Upload, 
  Plus, 
  Copy, 
  ClipboardList,
  Filter,
  X,
  Keyboard
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CommandBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onExport?: () => void;
  onBulkImport?: () => void;
  onAddRow?: () => void;
  onCheckDuplicates?: () => void;
  onCheckMissing?: () => void;
  onToggleFilters?: () => void;
  showFilters?: boolean;
  isAddingDisabled?: boolean;
}

export function CommandBar({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onExport,
  onBulkImport,
  onAddRow,
  onCheckDuplicates,
  onCheckMissing,
  onToggleFilters,
  showFilters,
  isAddingDisabled = false,
}: CommandBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const hasDateFilter = dateRange.from || dateRange.to;

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input - Expanded */}
          <div className={cn(
            "relative flex-1 min-w-[200px] max-w-md transition-all duration-200",
            isSearchFocused && "max-w-lg"
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders... (⌘+K)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="pl-10 pr-10 h-10 bg-muted/30 border-muted focus:bg-background"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 gap-2 font-normal",
                  hasDateFilter && "border-primary bg-primary/5 text-primary"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, y")
                    )
                  ) : (
                    "Date Filter"
                  )}
                </span>
                {hasDateFilter && (
                  <X 
                    className="h-3 w-3 ml-1 hover:text-destructive" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDateRangeChange({ from: undefined, to: undefined });
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Select Date Range</h4>
                    <p className="text-xs text-muted-foreground">Filter orders by date</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 h-7"
                    onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
                  >
                    All Time
                  </Button>
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className="p-3"
              />
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <div className="h-6 w-px bg-border hidden md:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onToggleFilters && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="sm"
                    className="h-9 gap-2"
                    onClick={onToggleFilters}
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden lg:inline">Filters</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle advanced filters</TooltipContent>
              </Tooltip>
            )}

            {onCheckDuplicates && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
                    onClick={onCheckDuplicates}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden lg:inline">Duplicates</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Check for duplicate order numbers</TooltipContent>
              </Tooltip>
            )}

            {onCheckMissing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950"
                    onClick={onCheckMissing}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span className="hidden lg:inline">Missing</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Check for missing orders</TooltipContent>
              </Tooltip>
            )}

            {onExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                    onClick={onExport}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden lg:inline">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export to CSV</TooltipContent>
              </Tooltip>
            )}

            {onBulkImport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
                    onClick={onBulkImport}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden lg:inline">Import</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bulk import orders</TooltipContent>
              </Tooltip>
            )}

            {onAddRow && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={onAddRow}
                    disabled={isAddingDisabled}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Order</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    Add new order
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                      <Keyboard className="h-3 w-3" /> N
                    </kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
