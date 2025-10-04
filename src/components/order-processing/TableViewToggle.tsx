import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableViewToggleProps {
  view: 'compact' | 'comfortable';
  onViewChange: (view: 'compact' | 'comfortable') => void;
}

export function TableViewToggle({ view, onViewChange }: TableViewToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('compact')}
        className={cn(
          "h-7 px-2",
          view === 'compact' && "bg-primary/10 text-primary"
        )}
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('comfortable')}
        className={cn(
          "h-7 px-2",
          view === 'comfortable' && "bg-primary/10 text-primary"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
