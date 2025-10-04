import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FilterChip {
  label: string;
  value: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onClearAll?: () => void;
}

export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium">Active Filters:</span>
      {filters.map((filter, index) => (
        <Badge 
          key={index}
          variant="secondary"
          className="gap-2 py-1 px-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <span className="text-xs font-medium">{filter.label}: {filter.value}</span>
          <button
            onClick={filter.onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 text-xs text-muted-foreground hover:text-destructive"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
