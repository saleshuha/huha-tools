import { Button } from '@/components/ui/button';
import { LayoutGrid, LayoutList, AlignJustify } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ViewMode = 'compact' | 'comfortable' | 'detailed';

interface POTableViewModeProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function POTableViewMode({ viewMode, onViewModeChange }: POTableViewModeProps) {
  const modes = [
    { value: 'compact' as ViewMode, icon: LayoutGrid, label: 'Compact', description: 'High density view' },
    { value: 'comfortable' as ViewMode, icon: LayoutList, label: 'Comfortable', description: 'Balanced view' },
    { value: 'detailed' as ViewMode, icon: AlignJustify, label: 'Detailed', description: 'Full information' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/40">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.value;

          return (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange(mode.value)}
                  className={`h-8 w-8 p-0 transition-all ${
                    isActive ? 'shadow-sm' : 'hover:bg-background'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{mode.label}</div>
                  <div className="text-muted-foreground">{mode.description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
