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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStatsCard
            icon={Package}
            label="Total Orders"
            value={totalOrders}
            variant="primary"
          />
          <QuickStatsCard
            icon={CheckSquare}
            label="Matched Orders"
            value={matchedOrdersCount}
            variant="success"
          />
          <QuickStatsCard
            icon={Clock}
            label="Pending Deductions"
            value={pendingDeductionCount}
            variant="warning"
          />
          <QuickStatsCard
            icon={Zap}
            label="Processed Orders"
            value={processedOrdersCount}
            variant="info"
          />
        </div>
      )}
    </div>
  );
}