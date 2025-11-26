import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Loader2, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSmartMatching } from '@/hooks/useSmartMatching';
import { POOrder } from '@/hooks/usePOOrders';
import { SunskySKU } from '@/hooks/useSKUManager';
import { MatchSuggestionCard } from './MatchSuggestionCard';
import { BulkMatchActions } from './BulkMatchActions';
import { EmptyMatchingState } from './EmptyMatchingState';
import { MatchingHistoryDialog } from './MatchingHistoryDialog';
interface SmartMatchingPanelProps {
  orders: POOrder[];
  sunskySKUs: SunskySKU[];
  userId: string | undefined;
}
export const SmartMatchingPanel: React.FC<SmartMatchingPanelProps> = ({
  orders,
  sunskySKUs,
  userId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const {
    suggestions,
    isAnalyzing,
    analyzeUnmatchedItems,
    approveMatch,
    rejectMatch,
    approveBulkMatches
  } = useSmartMatching(orders, sunskySKUs, userId);
  const unmatchedCount = orders.filter(o => !o.sunsky_sku?.id && o.status !== 'cancelled').length;
  const highConfidenceCount = suggestions.filter(s => s.confidence >= 85).length;
  const mediumConfidenceCount = suggestions.filter(s => s.confidence >= 65 && s.confidence < 85).length;
  const handleAnalyze = async () => {
    setHasAnalyzed(true);
    await analyzeUnmatchedItems();
  };
  const handleApprove = async (suggestion: any) => {
    setProcessingId(suggestion.poOrder.id);
    await approveMatch(suggestion);
    setProcessingId(null);
  };
  const handleBulkApprove = async () => {
    await approveBulkMatches(85);
  };
  return <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        
      </Collapsible>

      {/* History Dialog */}
      <MatchingHistoryDialog open={showHistory} onOpenChange={setShowHistory} userId={userId} />
    </>;
};