import { MetricCard } from './MetricCard';
import { ProcessingPipelineEnhanced } from './ProcessingPipelineEnhanced';
import { Package, Target, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

interface OrderDashboardProps {
  totalOrders: number;
  matchedCount: number;
  pendingCount: number;
  processedCount: number;
  unmatchedCount: number;
  currentStep: 'upload' | 'pending' | 'matched' | 'processed';
  onStepClick?: (step: string) => void;
  matchRate?: number;
}

export function OrderDashboard({
  totalOrders,
  matchedCount,
  pendingCount,
  processedCount,
  unmatchedCount,
  currentStep,
  onStepClick,
  matchRate = 0
}: OrderDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={Package}
          label="Total Orders"
          value={totalOrders}
          variant="neutral"
          onClick={() => onStepClick?.('upload')}
          isActive={currentStep === 'upload'}
        />
        <MetricCard
          icon={Target}
          label="Matched"
          value={matchedCount}
          subtitle={matchRate > 0 ? `${matchRate.toFixed(1)}% match rate` : undefined}
          variant="success"
          onClick={() => onStepClick?.('matched')}
          isActive={currentStep === 'matched'}
        />
        <MetricCard
          icon={Clock}
          label="Pending"
          value={pendingCount}
          variant={pendingCount > 0 ? 'warning' : 'neutral'}
          onClick={() => onStepClick?.('pending')}
          isActive={currentStep === 'pending'}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Processed"
          value={processedCount}
          variant="info"
          onClick={() => onStepClick?.('processed')}
          isActive={currentStep === 'processed'}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Unmatched"
          value={unmatchedCount}
          variant={unmatchedCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          icon={TrendingUp}
          label="Match Rate"
          value={Math.round(matchRate)}
          subtitle="%"
          variant={matchRate >= 80 ? 'success' : matchRate >= 50 ? 'warning' : 'neutral'}
          animate={false}
        />
      </div>

      {/* Processing Pipeline */}
      <ProcessingPipelineEnhanced
        currentStep={currentStep}
        uploadCount={totalOrders}
        matchedCount={matchedCount}
        pendingCount={pendingCount}
        processedCount={processedCount}
        onStepClick={onStepClick}
      />
    </div>
  );
}
