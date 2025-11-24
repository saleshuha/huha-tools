import { Button } from '@/components/ui/button';
import { X, CheckSquare } from 'lucide-react';

interface SelectionControlsProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAllFiltered?: () => void;
  hasActiveSearch?: boolean;
}

export function SelectionControls({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAllFiltered,
  hasActiveSearch = false,
}: SelectionControlsProps) {
  if (selectedCount === 0 && !hasActiveSearch) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-primary/10 border border-primary/20">
      {selectedCount > 0 && (
        <span className="text-sm font-medium text-foreground">
          Selected: <span className="text-primary">{selectedCount}</span> of {totalCount}
        </span>
      )}
      
      {hasActiveSearch && onSelectAllFiltered && (
        <Button
          variant="default"
          size="sm"
          onClick={onSelectAllFiltered}
          className="h-7 px-3 text-xs"
        >
          <CheckSquare className="h-3 w-3 mr-1" />
          Select All {totalCount} Results
        </Button>
      )}
      
      {selectedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 px-2 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
