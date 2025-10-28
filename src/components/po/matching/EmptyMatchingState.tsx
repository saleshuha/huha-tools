import { Sparkles, CheckCircle2, Search } from 'lucide-react';

interface EmptyMatchingStateProps {
  hasAnalyzed: boolean;
  unmatchedCount: number;
}

export const EmptyMatchingState: React.FC<EmptyMatchingStateProps> = ({
  hasAnalyzed,
  unmatchedCount
}) => {
  if (!hasAnalyzed) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Ready to Find Matches
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Click "Find Matches" to analyze your unmatched items and get intelligent SKU matching suggestions
        </p>
        {unmatchedCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {unmatchedCount} unmatched item{unmatchedCount !== 1 ? 's' : ''} available
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        No Matches Found
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        {unmatchedCount === 0 
          ? "All items are already matched! Great job."
          : "Couldn't find confident matches for the remaining items. Try manually matching them or check your Sunsky SKU inventory."}
      </p>
    </div>
  );
};
