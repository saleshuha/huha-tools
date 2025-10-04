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
  return;
}