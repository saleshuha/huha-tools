import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  totalRequired: number;
  onMarkAllPurchased: (quantity: number) => Promise<void>;
  onMarkNotAvailable: () => Promise<void>;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  totalRequired,
  onMarkAllPurchased,
  onMarkNotAvailable,
  onClearSelection,
}: BulkActionsBarProps) {
  const [bulkQuantity, setBulkQuantity] = useState<number>(totalRequired);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkPurchased = async () => {
    setIsProcessing(true);
    try {
      await onMarkAllPurchased(bulkQuantity);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkNotAvailable = async () => {
    setIsProcessing(true);
    try {
      await onMarkNotAvailable();
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-4 shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Qty:</span>
          <Input
            type="number"
            value={bulkQuantity}
            onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 0)}
            className="w-20 h-8"
            disabled={isProcessing}
          />
          <Button
            onClick={handleMarkPurchased}
            disabled={isProcessing || bulkQuantity <= 0}
            size="sm"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Mark Purchased
          </Button>
        </div>
        
        <Button
          variant="destructive"
          onClick={handleMarkNotAvailable}
          disabled={isProcessing}
          size="sm"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Not Available
        </Button>
      </div>
    </Card>
  );
}
