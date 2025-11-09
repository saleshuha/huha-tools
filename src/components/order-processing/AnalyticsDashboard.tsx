import { Card } from '@/components/ui/card';
import { QuickStatsCard } from './QuickStatsCard';
import { TrendingUp, CheckSquare, Clock, AlertTriangle, Package, Tag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
interface AnalyticsDashboardProps {
  totalOrders: number;
  matchedOrdersCount: number;
  unmatchedOrdersCount: number;
  processedOrdersCount: number;
  pendingDeductionCount?: number;
  currentStep: 'upload' | 'pending' | 'matched' | 'processed';
  totalValue?: number;
  latestOrderDate?: string;
  sunskyMatchedCount?: number;
}
export function AnalyticsDashboard({
  totalOrders,
  matchedOrdersCount,
  unmatchedOrdersCount,
  processedOrdersCount,
  pendingDeductionCount = 0,
  currentStep,
  totalValue,
  latestOrderDate,
  sunskyMatchedCount = 0
}: AnalyticsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const matchRate = totalOrders > 0 ? (matchedOrdersCount / totalOrders) * 100 : 0;
  const processingRate = matchedOrdersCount > 0 ? (processedOrdersCount / matchedOrdersCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Order Analytics</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickStatsCard
            label="Total Orders"
            value={totalOrders}
            icon={Package}
            variant={currentStep === 'processed' ? 'success' : 'neutral'}
          />
          <QuickStatsCard
            label={`Matched (${matchRate.toFixed(1)}%)`}
            value={matchedOrdersCount}
            icon={CheckSquare}
            variant={matchRate > 80 ? 'success' : matchRate < 50 ? 'warning' : 'info'}
          />
          <QuickStatsCard
            label={`Processed (${processingRate.toFixed(1)}%)`}
            value={processedOrdersCount}
            icon={Zap}
            variant={processingRate > 90 ? 'success' : 'info'}
          />
          <QuickStatsCard
            label="Pending Deduction"
            value={pendingDeductionCount}
            icon={Clock}
            variant={pendingDeductionCount > 0 ? 'warning' : 'neutral'}
          />
          <QuickStatsCard
            label="Sunsky Matches"
            value={sunskyMatchedCount}
            icon={Package}
            variant="info"
          />
        </div>
      )}
    </div>
  );
}