import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Search, Loader2, StopCircle } from 'lucide-react';

interface SearchProgress {
  current: number;
  total: number;
  currentItem: string;
  found: number;
  notFound: number;
  status: 'searching' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

interface SunskySearchProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SearchProgress;
  onCancel?: () => void;
}

export const SunskySearchProgressDialog: React.FC<SunskySearchProgressDialogProps> = ({
  open,
  onOpenChange,
  progress,
  onCancel,
}) => {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress.status === 'searching' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Searching Sunsky Catalog
              </>
            )}
            {progress.status === 'completed' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Search Completed
              </>
            )}
            {progress.status === 'cancelled' && (
              <>
                <StopCircle className="h-5 w-5 text-orange-500" />
                Search Cancelled
              </>
            )}
            {progress.status === 'error' && (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Search Error
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {progress.status === 'searching' && 'Looking up unmatched items in Sunsky catalog...'}
            {progress.status === 'completed' && 'Finished searching all unmatched items.'}
            {progress.status === 'cancelled' && 'Search was stopped by user.'}
            {progress.status === 'error' && progress.error}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progress.current} of {progress.total}</span>
              <span>{percentage.toFixed(0)}%</span>
            </div>
          </div>

          {/* Current item being searched */}
          {progress.status === 'searching' && progress.currentItem && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Searching:</span>
                <span className="font-mono text-xs truncate">{progress.currentItem}</span>
              </div>
            </div>
          )}

          {/* Results summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{progress.found}</div>
              <div className="text-xs text-muted-foreground">Found & Imported</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{progress.notFound}</div>
              <div className="text-xs text-muted-foreground">Not Found</div>
            </div>
          </div>

          {/* Cancel button */}
          {progress.status === 'searching' && onCancel && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onCancel}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Search
            </Button>
          )}

          {/* Close button when done */}
          {(progress.status === 'completed' || progress.status === 'cancelled' || progress.status === 'error') && (
            <Button 
              variant="default" 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
