import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SelectionControlsProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
}

export function SelectionControls({
  selectedCount,
  totalCount,
  onClearSelection,
}: SelectionControlsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-primary/10 border border-primary/20">
      <span className="text-sm font-medium text-foreground">
        Selected: <span className="text-primary">{selectedCount}</span> of {totalCount}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-7 px-2 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
