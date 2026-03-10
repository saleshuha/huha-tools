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
    try { await onMarkAllPurchased(bulkQuantity); } finally { setIsProcessing(false); }
  };

  const handleMarkNotAvailable = async () => {
    setIsProcessing(true);
    try { await onMarkNotAvailable(); } finally { setIsProcessing(false); }
  };

  if (selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-3 shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm max-w-[95vw]">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {selectedCount} selected
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 w-7 p-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Qty:</span>
          <Input
            type="number"
            value={bulkQuantity}
            onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 0)}
            className="w-16 h-7 text-xs"
            disabled={isProcessing}
          />
          <Button onClick={handleMarkPurchased} disabled={isProcessing || bulkQuantity <= 0} size="sm" className="h-7 text-xs px-2">
            {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            Done
          </Button>
        </div>
        
        <Button variant="destructive" onClick={handleMarkNotAvailable} disabled={isProcessing} size="sm" className="h-7 text-xs px-2">
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
          N/A
        </Button>
      </div>
    </Card>
  );
}
