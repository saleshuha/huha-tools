import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisplayFiltersToggleProps {
  showDisabledItems: boolean;
  onShowDisabledChange: (checked: boolean) => void;
  disabledCount?: number;
}

export function DisplayFiltersToggle({
  showDisabledItems,
  onShowDisabledChange,
  disabledCount
}: DisplayFiltersToggleProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-muted/30 to-transparent rounded-xl border border-border/40">
      <div className="flex items-center gap-2">
        {showDisabledItems ? (
          <EyeOff className="w-4 h-4 text-orange-500" />
        ) : (
          <Eye className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-muted-foreground">Display Filters:</span>
      </div>
      
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200',
        showDisabledItems 
          ? 'bg-orange-500/10 border-orange-500/30' 
          : 'bg-background border-border/60'
      )}>
        <Switch
          id="show-disabled"
          checked={showDisabledItems}
          onCheckedChange={onShowDisabledChange}
          className="data-[state=checked]:bg-orange-500"
        />
        <Label 
          htmlFor="show-disabled" 
          className={cn(
            "text-sm cursor-pointer transition-colors",
            showDisabledItems ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-foreground'
          )}
        >
          Show Only Disabled Items
        </Label>
        {showDisabledItems && disabledCount !== undefined && (
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 dark:text-orange-400">
            {disabledCount}
          </Badge>
        )}
      </div>
    </div>
  );
}
