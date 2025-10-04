import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  className
}: SortableTableHeaderProps) {
  const isActive = currentSort === sortKey;

  return (
    <TableHead className={cn("cursor-pointer select-none", className)}>
      <div
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-2 hover:text-foreground transition-colors",
          isActive && "text-primary font-semibold"
        )}
      >
        <span>{label}</span>
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-40" />
        )}
      </div>
    </TableHead>
  );
}
