import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface SmartFiltersPanelProps {
  filters: {
    velocityCategory: string[];
    trend: string[];
    stockStatus: string[];
    confidence: string[];
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearFilters: () => void;
}

export function SmartFiltersPanel({ filters, onFilterChange, onClearFilters }: SmartFiltersPanelProps) {
  const hasActiveFilters = 
    filters.velocityCategory.length > 0 ||
    filters.trend.length > 0 ||
    filters.stockStatus.length > 0 ||
    filters.confidence.length > 0;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Smart Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Velocity Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Velocity Category</label>
          <Select onValueChange={(value) => onFilterChange('velocityCategory', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Fast Moving">Fast Moving</SelectItem>
              <SelectItem value="Medium Moving">Medium Moving</SelectItem>
              <SelectItem value="Slow Moving">Slow Moving</SelectItem>
              <SelectItem value="No Sales">No Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trend Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Trend Direction</label>
          <Select onValueChange={(value) => onFilterChange('trend', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All trends" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trends</SelectItem>
              <SelectItem value="trending_up">Trending Up</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="trending_down">Trending Down</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stock Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Stock Status</label>
          <Select onValueChange={(value) => onFilterChange('stockStatus', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="critical">Critical (≤7 days)</SelectItem>
              <SelectItem value="low">Low (8-14 days)</SelectItem>
              <SelectItem value="adequate">Adequate (15-30 days)</SelectItem>
              <SelectItem value="healthy">Healthy (&gt;30 days)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Confidence Level</label>
          <Select onValueChange={(value) => onFilterChange('confidence', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="high">High (&gt;80%)</SelectItem>
              <SelectItem value="medium">Medium (50-80%)</SelectItem>
              <SelectItem value="low">Low (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.velocityCategory.map(filter => (
            <Badge key={filter} variant="secondary">
              {filter}
              <X
                className="h-3 w-3 ml-2 cursor-pointer"
                onClick={() => onFilterChange('velocityCategory', filter)}
              />
            </Badge>
          ))}
          {filters.trend.map(filter => (
            <Badge key={filter} variant="secondary">
              {filter.replace('_', ' ')}
              <X
                className="h-3 w-3 ml-2 cursor-pointer"
                onClick={() => onFilterChange('trend', filter)}
              />
            </Badge>
          ))}
          {filters.stockStatus.map(filter => (
            <Badge key={filter} variant="secondary">
              {filter}
              <X
                className="h-3 w-3 ml-2 cursor-pointer"
                onClick={() => onFilterChange('stockStatus', filter)}
              />
            </Badge>
          ))}
          {filters.confidence.map(filter => (
            <Badge key={filter} variant="secondary">
              {filter} confidence
              <X
                className="h-3 w-3 ml-2 cursor-pointer"
                onClick={() => onFilterChange('confidence', filter)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
