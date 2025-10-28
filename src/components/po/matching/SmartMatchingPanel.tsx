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

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      🤖 Smart Matching Assistant
                      {unmatchedCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {unmatchedCount} unmatched
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      AI-powered SKU matching suggestions with historical learning
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {suggestions.length > 0 && (
                    <Badge variant="secondary" className="mr-2">
                      {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Action Bar */}
              <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || unmatchedCount === 0}
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Find Matches
                      </>
                    )}
                  </Button>

                  {unmatchedCount === 0 && (
                    <span className="text-sm text-muted-foreground">
                      All items matched ✓
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>

              {/* Bulk Actions */}
              {suggestions.length > 0 && (
                <BulkMatchActions
                  highConfidenceCount={highConfidenceCount}
                  mediumConfidenceCount={mediumConfidenceCount}
                  onAcceptAll={handleBulkApprove}
                  isProcessing={isAnalyzing}
                />
              )}

              {/* Suggestions List */}
              <div className="space-y-3 mt-4">
                {suggestions.length === 0 ? (
                  <EmptyMatchingState
                    hasAnalyzed={hasAnalyzed}
                    unmatchedCount={unmatchedCount}
                  />
                ) : (
                  suggestions.map((suggestion) => (
                    <MatchSuggestionCard
                      key={suggestion.poOrder.id}
                      suggestion={suggestion}
                      onApprove={() => handleApprove(suggestion)}
                      onReject={() => rejectMatch(suggestion)}
                      isProcessing={processingId === suggestion.poOrder.id}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* History Dialog */}
      <MatchingHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        userId={userId}
      />
    </>
  );
};
