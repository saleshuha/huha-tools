import { Card } from '@/components/ui/card';
import { QuickStatsCard } from './QuickStatsCard';
import { 
  TrendingUp, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Package,
  Tag,
  Zap
} from 'lucide-react';
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
      {/* Collapsible Analytics Header */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-foreground">Analytics Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Track your order processing metrics
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>

        {isExpanded && (
          <div className="p-4 pt-0 space-y-4 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickStatsCard
                icon={Package}
                label="Total Orders"
                value={totalOrders}
                variant="primary"
              />
              
              {pendingDeductionCount > 0 && (
                <QuickStatsCard
                  icon={Zap}
                  label="Pending Deduction"
                  value={pendingDeductionCount}
                  variant="warning"
                />
              )}
              
              <QuickStatsCard
                icon={Tag}
                label="Matched"
                value={matchedOrdersCount}
                variant="info"
              />
              
              <QuickStatsCard
                icon={CheckSquare}
                label="Processed"
                value={processedOrdersCount}
                variant="success"
              />
              
              {unmatchedOrdersCount > 0 && (
                <QuickStatsCard
                  icon={AlertTriangle}
                  label="Unmatched"
                  value={unmatchedOrdersCount}
                  variant="warning"
                />
              )}
              
              {latestOrderDate && (
                <QuickStatsCard
                  icon={Clock}
                  label="Latest Order"
                  value={latestOrderDate}
                  variant="neutral"
                />
              )}
            </div>

            {/* Success Rate Indicator */}
            {totalOrders > 0 && (
              <Card className="p-3 bg-gradient-to-r from-success/10 to-success/5 border-success/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium text-success">Match Rate</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-success">
                      {Math.round((matchedOrdersCount / totalOrders) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {matchedOrdersCount} of {totalOrders} matched
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
