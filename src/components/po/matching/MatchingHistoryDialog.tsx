import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Clock, TrendingUp } from 'lucide-react';
import { useMatchPatterns } from '@/hooks/useMatchPatterns';
import { format } from 'date-fns';

interface MatchingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
}

export const MatchingHistoryDialog: React.FC<MatchingHistoryDialogProps> = ({
  open,
  onOpenChange,
  userId
}) => {
  const { patterns, isLoading, deletePattern } = useMatchPatterns(userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Matching History
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Patterns learned from your approved matches
          </p>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading patterns...
            </div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No matching patterns yet</p>
              <p className="text-xs mt-1">Approved matches will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {pattern.po_sku_pattern}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono text-sm font-medium text-primary">
                        {pattern.sunsky_sku_pattern}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Used {pattern.times_used}×</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {pattern.confidence_score}% confidence
                      </Badge>
                      <span>
                        Last: {format(new Date(pattern.last_used_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePattern(pattern.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
