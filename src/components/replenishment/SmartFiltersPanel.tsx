import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface FilterOptions {
  velocityCategory: string[];
  trend: string[];
  stockStatus: string[];
  confidence: string[];
}

interface SmartFiltersPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  itemCounts: {
    fast: number;
    medium: number;
    slow: number;
    none: number;
    trendingUp: number;
    trendingDown: number;
    stable: number;
    critical: number;
    low: number;
    adequate: number;
    high: number;
    mediumConf: number;
    lowConf: number;
  };
}

export function SmartFiltersPanel({ filters, onFilterChange, itemCounts }: SmartFiltersPanelProps) {
  const toggleFilter = (category: keyof FilterOptions, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onFilterChange({ ...filters, [category]: updated });
  };

  const clearAllFilters = () => {
    onFilterChange({
      velocityCategory: [],
      trend: [],
      stockStatus: [],
      confidence: []
    });
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Smart Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Velocity Category */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Velocity Category</label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.velocityCategory.includes('Fast Moving') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('velocityCategory', 'Fast Moving')}
            >
              🔥 Fast ({itemCounts.fast})
            </Badge>
            <Badge
              variant={filters.velocityCategory.includes('Medium Moving') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('velocityCategory', 'Medium Moving')}
            >
              ⚡ Medium ({itemCounts.medium})
            </Badge>
            <Badge
              variant={filters.velocityCategory.includes('Slow Moving') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('velocityCategory', 'Slow Moving')}
            >
              🐌 Slow ({itemCounts.slow})
            </Badge>
            <Badge
              variant={filters.velocityCategory.includes('No Sales') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('velocityCategory', 'No Sales')}
            >
              ⛔ No Sales ({itemCounts.none})
            </Badge>
          </div>
        </div>

        {/* Trend */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Trend Direction</label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.trend.includes('trending_up') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('trend', 'trending_up')}
            >
              📈 Up ({itemCounts.trendingUp})
            </Badge>
            <Badge
              variant={filters.trend.includes('stable') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('trend', 'stable')}
            >
              ➡️ Stable ({itemCounts.stable})
            </Badge>
            <Badge
              variant={filters.trend.includes('trending_down') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('trend', 'trending_down')}
            >
              📉 Down ({itemCounts.trendingDown})
            </Badge>
          </div>
        </div>

        {/* Stock Status */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Stock Status</label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.stockStatus.includes('critical') ? 'destructive' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('stockStatus', 'critical')}
            >
              🔴 Critical (&lt;7d) ({itemCounts.critical})
            </Badge>
            <Badge
              variant={filters.stockStatus.includes('low') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('stockStatus', 'low')}
            >
              🟡 Low (7-14d) ({itemCounts.low})
            </Badge>
            <Badge
              variant={filters.stockStatus.includes('adequate') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('stockStatus', 'adequate')}
            >
              🟢 Adequate (&gt;14d) ({itemCounts.adequate})
            </Badge>
          </div>
        </div>

        {/* Confidence Level */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Confidence Level</label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.confidence.includes('high') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('confidence', 'high')}
            >
              ✅ High (&gt;80%) ({itemCounts.high})
            </Badge>
            <Badge
              variant={filters.confidence.includes('medium') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('confidence', 'medium')}
            >
              ⚠️ Medium (50-80%) ({itemCounts.mediumConf})
            </Badge>
            <Badge
              variant={filters.confidence.includes('low') ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80"
              onClick={() => toggleFilter('confidence', 'low')}
            >
              ❌ Low (&lt;50%) ({itemCounts.lowConf})
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
