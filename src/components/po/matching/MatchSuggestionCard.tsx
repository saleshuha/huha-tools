import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowRight, Package, Sparkles } from 'lucide-react';
import { MatchSuggestion } from '@/utils/fuzzy-matcher';
import { MatchingConfidenceBadge } from './MatchingConfidenceBadge';

interface MatchSuggestionCardProps {
  suggestion: MatchSuggestion;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export const MatchSuggestionCard: React.FC<MatchSuggestionCardProps> = ({
  suggestion,
  onApprove,
  onReject,
  isProcessing = false
}) => {
  const { poOrder, suggestedSku, confidence, reason, matchType } = suggestion;

  const matchTypeLabels: Record<string, string> = {
    historical: '📚 Historical',
    sku_fuzzy: '🔤 SKU Match',
    title_fuzzy: '📝 Title Match',
    model_fuzzy: '🔢 Model Match'
  };

  return (
    <Card className="border-2 hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: PO Order Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                {poOrder.po_number}
              </span>
              <Badge variant="outline" className="text-xs">
                {matchTypeLabels[matchType] || matchType}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-mono font-medium">
                  {poOrder.sku_code || poOrder.asin || 'N/A'}
                </span>
              </div>
              {poOrder.serial_number && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Serial:</span>
                  <span className="font-mono text-xs">
                    {poOrder.serial_number}
                  </span>
                </div>
              )}
              {poOrder.title && (
                <div className="text-muted-foreground text-xs line-clamp-1">
                  {poOrder.title}
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center pt-6">
            <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
          </div>

          {/* Right side: Suggested Sunsky SKU */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-primary">
                Suggested Match
              </span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-mono font-medium text-primary">
                  {suggestedSku.sku_code || 'N/A'}
                </span>
              </div>
              {suggestedSku.description && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Desc:</span>
                  <span className="font-mono text-xs line-clamp-1">
                    {suggestedSku.description}
                  </span>
                </div>
              )}
              {suggestedSku.title && (
                <div className="text-muted-foreground text-xs line-clamp-1">
                  {suggestedSku.title}
                </div>
              )}
            </div>

            {/* Confidence and Reason */}
            <div className="flex flex-col gap-1.5 pt-1">
              <MatchingConfidenceBadge confidence={confidence} />
              <p className="text-xs text-muted-foreground italic">
                {reason}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-4">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="border-red-500/30 hover:border-red-500 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
