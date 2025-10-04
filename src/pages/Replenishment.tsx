import { BarChart3 } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { useUnifiedVelocityAnalytics } from '@/hooks/useUnifiedVelocityAnalytics';
import { VelocityDashboardHeader } from '@/components/replenishment/VelocityDashboardHeader';
import { VelocityVisualizationCards } from '@/components/replenishment/VelocityVisualizationCards';
import { SmartFiltersPanel, FilterOptions } from '@/components/replenishment/SmartFiltersPanel';
import { EnhancedVelocityTable } from '@/components/replenishment/EnhancedVelocityTable';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ReplenishmentPage() {
  const { velocityItems, velocityMetrics, loading, saveManualOverride } = useUnifiedVelocityAnalytics();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    velocityCategory: [],
    trend: [],
    stockStatus: [],
    confidence: []
  });

  const filteredItems = useMemo(() => {
    return velocityItems.filter(item => {
      // Velocity category filter
      if (filters.velocityCategory.length > 0 && !filters.velocityCategory.includes(item.velocity_category)) {
        return false;
      }

      // Trend filter
      if (filters.trend.length > 0 && !filters.trend.includes(item.velocity_trend)) {
        return false;
      }

      // Stock status filter
      if (filters.stockStatus.length > 0) {
        const daysLeft = item.days_until_stockout;
        if (daysLeft === null) return false;
        
        const isCritical = daysLeft <= 7;
        const isLow = daysLeft > 7 && daysLeft <= 14;
        const isAdequate = daysLeft > 14;

        if (filters.stockStatus.includes('critical') && isCritical) return true;
        if (filters.stockStatus.includes('low') && isLow) return true;
        if (filters.stockStatus.includes('adequate') && isAdequate) return true;
        return false;
      }

      // Confidence filter
      if (filters.confidence.length > 0) {
        const conf = item.recommendation_confidence;
        const isHigh = conf > 80;
        const isMedium = conf >= 50 && conf <= 80;
        const isLow = conf < 50;

        if (filters.confidence.includes('high') && isHigh) return true;
        if (filters.confidence.includes('medium') && isMedium) return true;
        if (filters.confidence.includes('low') && isLow) return true;
        return false;
      }

      return true;
    });
  }, [velocityItems, filters]);

  const itemCounts = useMemo(() => ({
    fast: velocityItems.filter(i => i.velocity_category === 'Fast Moving').length,
    medium: velocityItems.filter(i => i.velocity_category === 'Medium Moving').length,
    slow: velocityItems.filter(i => i.velocity_category === 'Slow Moving').length,
    none: velocityItems.filter(i => i.velocity_category === 'No Sales').length,
    trendingUp: velocityItems.filter(i => i.velocity_trend === 'trending_up').length,
    trendingDown: velocityItems.filter(i => i.velocity_trend === 'trending_down').length,
    stable: velocityItems.filter(i => i.velocity_trend === 'stable').length,
    critical: velocityItems.filter(i => i.days_until_stockout !== null && i.days_until_stockout <= 7).length,
    low: velocityItems.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 7 && i.days_until_stockout <= 14).length,
    adequate: velocityItems.filter(i => i.days_until_stockout !== null && i.days_until_stockout > 14).length,
    high: velocityItems.filter(i => i.recommendation_confidence > 80).length,
    mediumConf: velocityItems.filter(i => i.recommendation_confidence >= 50 && i.recommendation_confidence <= 80).length,
    lowConf: velocityItems.filter(i => i.recommendation_confidence < 50).length
  }), [velocityItems]);

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(filteredItems.map(item => item.item_id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleEditQuantity = (itemId: string, quantity: number, systemRecommendation: number) => {
    saveManualOverride(itemId, quantity, systemRecommendation, 'Manual adjustment');
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />}
          title="Sales & Replenishment Analytics"
          subtitle="Advanced velocity analytics with intelligent recommendation engine"
          className="mb-8"
        />

        <VelocityDashboardHeader metrics={velocityMetrics} loading={loading} />
        
        <VelocityVisualizationCards items={velocityItems} loading={loading} />

        <SmartFiltersPanel 
          filters={filters} 
          onFilterChange={setFilters}
          itemCounts={itemCounts}
        />

        {selectedItems.size > 0 && (
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedItems.size} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedItems(new Set())}>
                  Clear Selection
                </Button>
                <Button>
                  Bulk Order ({selectedItems.size} items)
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="glass-container mx-6 p-8">
          <EnhancedVelocityTable
            items={filteredItems}
            loading={loading}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onEditQuantity={handleEditQuantity}
          />
        </div>
      </div>
    </div>
  );
}
