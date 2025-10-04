import { useState } from 'react';
import { useUnifiedVelocityAnalytics } from '@/hooks/useUnifiedVelocityAnalytics';
import { VelocityDashboardHeader } from '@/components/replenishment/VelocityDashboardHeader';
import { VelocityVisualizationCards } from '@/components/replenishment/VelocityVisualizationCards';
import { EnhancedVelocityTable } from '@/components/replenishment/EnhancedVelocityTable';
import { SmartFiltersPanel } from '@/components/replenishment/SmartFiltersPanel';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export default function ReplenishmentPage() {
  const { velocityItems, velocityMetrics, loading, loadVelocityAnalysis, saveManualOverride } = useUnifiedVelocityAnalytics();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    velocityCategory: [] as string[],
    trend: [] as string[],
    stockStatus: [] as string[],
    confidence: [] as string[]
  });

  const handleSelectItem = (itemId: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
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

  const handleEditQuantity = async (itemId: string, quantity: number) => {
    const item = velocityItems.find(i => i.item_id === itemId);
    if (item) {
      await saveManualOverride(itemId, quantity, item.recommended_reorder_quantity);
      await loadVelocityAnalysis();
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (value === 'all') {
      setFilters(prev => ({ ...prev, [filterType]: [] }));
    } else {
      setFilters(prev => {
        const current = prev[filterType as keyof typeof filters];
        const newFilters = current.includes(value)
          ? current.filter(f => f !== value)
          : [...current, value];
        return { ...prev, [filterType]: newFilters };
      });
    }
  };

  const handleClearFilters = () => {
    setFilters({
      velocityCategory: [],
      trend: [],
      stockStatus: [],
      confidence: []
    });
  };

  // Apply filters
  const filteredItems = velocityItems.filter(item => {
    if (filters.velocityCategory.length > 0 && !filters.velocityCategory.includes(item.velocity_category)) {
      return false;
    }
    if (filters.trend.length > 0 && !filters.trend.includes(item.velocity_trend)) {
      return false;
    }
    if (filters.stockStatus.length > 0) {
      const status = item.days_until_stockout !== null
        ? item.days_until_stockout <= 7 ? 'critical'
        : item.days_until_stockout <= 14 ? 'low'
        : item.days_until_stockout <= 30 ? 'adequate'
        : 'healthy'
        : null;
      if (!status || !filters.stockStatus.includes(status)) return false;
    }
    if (filters.confidence.length > 0) {
      const confidenceLevel = item.recommendation_confidence > 80 ? 'high'
        : item.recommendation_confidence >= 50 ? 'medium'
        : 'low';
      if (!filters.confidence.includes(confidenceLevel)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Velocity Analytics & Replenishment</h1>
            <p className="text-muted-foreground mt-1">AI-powered inventory recommendations with safety stock analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => loadVelocityAnalysis()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <VelocityDashboardHeader metrics={velocityMetrics} loading={loading} />
        
        <VelocityVisualizationCards items={filteredItems} loading={loading} />
        
        <SmartFiltersPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Inventory Items</h2>
              <p className="text-sm text-muted-foreground">
                Showing {filteredItems.length} of {velocityItems.length} items
                {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
              </p>
            </div>
          </div>

          <EnhancedVelocityTable
            items={filteredItems}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onEditQuantity={handleEditQuantity}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
