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

const priorityConfig = {
  1: { label: '🚀 1st Nearest Shipment', color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
  2: { label: '🔥 2nd Nearest Shipment', color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
  3: { label: '📦 3rd Nearest Shipment', color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800' },
  4: { label: '📅 4th Nearest Shipment', color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  5: { label: '⏰ 5th Nearest Shipment', color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' }
} as const;

export function POPriorityBadge({ priority, onUpdate, disabled }: POPriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig[3];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("text-xs border", config.color)}
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
            {cfg.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
