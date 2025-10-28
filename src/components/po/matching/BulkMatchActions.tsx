import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap, AlertTriangle } from 'lucide-react';

interface BulkMatchActionsProps {
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  onAcceptAll: () => void;
  isProcessing?: boolean;
}

export const BulkMatchActions: React.FC<BulkMatchActionsProps> = ({
  highConfidenceCount,
  mediumConfidenceCount,
  onAcceptAll,
  isProcessing = false
}) => {
  if (highConfidenceCount === 0) return null;

  return (
    <Card className="border-2 border-green-500/30 bg-green-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {highConfidenceCount} high-confidence match{highConfidenceCount !== 1 ? 'es' : ''} found
                </span>
                <Badge variant="outline" className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                  ≥85% confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                These matches are highly accurate and ready to approve
                {mediumConfidenceCount > 0 && (
                  <span className="ml-1">
                    • {mediumConfidenceCount} medium-confidence match{mediumConfidenceCount !== 1 ? 'es' : ''} require review
                  </span>
                )}
              </p>
            </div>
          </div>

          <Button
            onClick={onAcceptAll}
            disabled={isProcessing}
            className="bg-green-500 hover:bg-green-600 text-white shadow-medium"
          >
            <Zap className="h-4 w-4 mr-2" />
            Accept All High Confidence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
