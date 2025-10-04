import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onProcessSelected: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  onProcessSelected,
  onClearSelection,
  isProcessing = false
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/20 backdrop-blur-sm animate-slide-down">
      <div className="flex items-center gap-3">
        <Badge variant="default" className="px-3 py-1">
          {selectedCount} selected
        </Badge>
        <span className="text-sm text-muted-foreground">
          Ready for bulk processing
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onProcessSelected}
          disabled={isProcessing}
          size="sm"
          className="gap-2"
        >
          <Package className="h-4 w-4" />
          {isProcessing ? 'Processing...' : 'Process Selected'}
        </Button>
        
        <Button
          onClick={onClearSelection}
          variant="ghost"
          size="sm"
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
