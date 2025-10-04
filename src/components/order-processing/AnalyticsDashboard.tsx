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
}
export function AnalyticsDashboard({
  totalOrders,
  matchedOrdersCount,
  unmatchedOrdersCount,
  processedOrdersCount,
  pendingDeductionCount = 0,
  currentStep,
  totalValue,
  latestOrderDate
}: AnalyticsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="p-6 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur border-primary/20">
      <div className="flex items-center justify-between mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStatsCard
            label="Total Orders"
            value={totalOrders}
            icon={Package}
            variant="neutral"
          />
          <QuickStatsCard
            label="Matched Orders"
            value={matchedOrdersCount}
            icon={CheckSquare}
            variant="success"
          />
          <QuickStatsCard
            label="Unmatched Orders"
            value={unmatchedOrdersCount}
            icon={AlertTriangle}
            variant="warning"
          />
          <QuickStatsCard
            label="Processed Orders"
            value={processedOrdersCount}
            icon={Zap}
            variant="primary"
          />
        </div>
      )}
    </Card>
  );
}