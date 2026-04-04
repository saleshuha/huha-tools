import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface POPriorityBadgeProps {
  priority: number;
  onUpdate: (newPriority: number) => void;
  disabled?: boolean;
}

const priorityConfig: Record<number, { label: string; fullLabel: string; color: string }> = {
  1: { label: '🚀 P1', fullLabel: '🚀 P1 - Critical', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
  2: { label: '🔥 P2', fullLabel: '🔥 P2 - High', color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
  3: { label: '📦 P3', fullLabel: '📦 P3 - Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800' },
  4: { label: '📅 P4', fullLabel: '📅 P4 - Low', color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  5: { label: '⏰ P5', fullLabel: '⏰ P5 - Minimal', color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
  6: { label: '📋 P6', fullLabel: '📋 P6 - Deferred', color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800' },
  7: { label: '🗂️ P7', fullLabel: '🗂️ P7 - Backlog', color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800' },
  8: { label: '📁 P8', fullLabel: '📁 P8 - Archive', color: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-800' },
  9: { label: '🔖 P9', fullLabel: '🔖 P9 - Reserve', color: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-950 dark:text-stone-300 dark:border-stone-800' },
  10: { label: '⬇️ P10', fullLabel: '⬇️ P10 - Lowest', color: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800' },
};

export function POPriorityBadge({ priority, onUpdate, disabled }: POPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig[3];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("text-xs border flex-shrink-0", config.color)}
          disabled={disabled}
        >
          {config.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(priorityConfig).map(([value, cfg]) => (
          <DropdownMenuItem 
            key={value}
            onClick={() => onUpdate(parseInt(value))}
            className={cn(
              "cursor-pointer",
              priority === parseInt(value) && "bg-accent font-medium"
            )}
          >
            {cfg.fullLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
